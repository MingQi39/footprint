/**
 * 将 marketing/chenze-itinerary.json 导入为演示账号的打卡记录。
 *
 * 用法（在 api 目录）：
 *   npm run seed:chenze
 *   npx tsx scripts/import-chenze-itinerary.ts --nickname=Qi        # 导入到已有微信用户
 *   npx tsx scripts/import-chenze-itinerary.ts --user-id=2
 *   npx tsx scripts/import-chenze-itinerary.ts --append           # 不清空，按 id 跳过重复
 *
 * 环境：需已配置 .env 的 DATABASE_URL，MySQL 可连。
 * 首次请先：npx prisma db push（或 npm run seed:chenze，会自动 push）
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const __dirname = dirname(fileURLToPath(import.meta.url));
const JSON_PATH = join(__dirname, "../../marketing/chenze-itinerary.json");

const DEMO_OPENID = "demo_chenze_footprint";
const DEMO_NICKNAME = "陈泽·足迹演示";
const IMPORT_TAG_PREFIX = "#chenze-import:";

type TimelineItem = {
  id: string;
  dateLabel: string;
  dateStart: string;
  city: string;
  province?: string;
  country: string;
  lat: number;
  lng: number;
  placeName?: string;
  event: string;
  tags?: string[];
  source?: string;
  note?: string;
  companions?: string[];
};

type ItineraryFile = {
  timeline: TimelineItem[];
};

function parseArgs(argv: string[]) {
  const userId = argv.find((a) => a.startsWith("--user-id="))?.split("=")[1];
  const nicknameTarget = argv.find((a) => a.startsWith("--nickname="))?.split("=")[1];
  const openidTarget = argv.find((a) => a.startsWith("--openid="))?.split("=")[1];
  const useDemoAccount = !userId && !nicknameTarget && !openidTarget;

  return {
    append: argv.includes("--append"),
    userId,
    nicknameTarget,
    openidTarget,
    useDemoAccount,
    openid: openidTarget ?? DEMO_OPENID,
    nickname: useDemoAccount ? DEMO_NICKNAME : undefined,
  };
}

async function resolveUser(
  prisma: PrismaClient,
  args: ReturnType<typeof parseArgs>,
) {
  if (args.userId) {
    const user = await prisma.user.findUnique({
      where: { id: BigInt(args.userId) },
    });
    if (!user) {
      throw new Error(`未找到 user-id=${args.userId}`);
    }
    return user;
  }

  if (args.nicknameTarget) {
    const users = await prisma.user.findMany({
      where: { nickname: { contains: args.nicknameTarget } },
      orderBy: { id: "desc" },
    });
    if (!users.length) {
      throw new Error(`未找到昵称包含「${args.nicknameTarget}」的用户，请先用小程序登录一次`);
    }
    if (users.length > 1) {
      console.error("匹配到多个用户，请改用 --user-id=：");
      for (const u of users) {
        console.error(`  id=${u.id.toString()} nickname=${u.nickname} openid=${u.openid}`);
      }
      throw new Error("昵称不唯一");
    }
    return users[0];
  }

  if (args.openidTarget) {
    const user = await prisma.user.findUnique({
      where: { openid: args.openidTarget },
    });
    if (!user) {
      throw new Error(`未找到 openid=${args.openidTarget}，请先用该账号登录小程序`);
    }
    return user;
  }

  return prisma.user.upsert({
    where: { openid: DEMO_OPENID },
    update: { nickname: DEMO_NICKNAME },
    create: { openid: DEMO_OPENID, nickname: DEMO_NICKNAME },
  });
}

function checkinAtFromDate(dateStart: string): Date {
  return new Date(`${dateStart}T12:00:00+08:00`);
}

function buildName(item: TimelineItem): string {
  if (item.placeName) {
    return `${item.city} · ${item.placeName}`;
  }
  return `${item.city}｜${item.event}`;
}

function buildNote(item: TimelineItem): string {
  const lines = [`${IMPORT_TAG_PREFIX}${item.id}`, `时间：${item.dateLabel}`, item.event];
  if (item.companions?.length) {
    lines.push(`同行：${item.companions.join("、")}`);
  }
  if (item.tags?.length) {
    lines.push(`标签：${item.tags.join(" · ")}`);
  }
  if (item.source) {
    lines.push(`来源：${item.source}`);
  }
  if (item.note) {
    lines.push(item.note);
  }
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { append, useDemoAccount, openid, nickname } = args;

  const raw = readFileSync(JSON_PATH, "utf8");
  const data = JSON.parse(raw) as ItineraryFile;
  if (!Array.isArray(data.timeline) || !data.timeline.length) {
    throw new Error("chenze-itinerary.json 缺少 timeline");
  }

  const prisma = new PrismaClient();

  try {
    const user = await resolveUser(prisma, args);

    if (!append) {
      const deleted = await prisma.checkin.deleteMany({
        where: {
          userId: user.id,
          note: { startsWith: IMPORT_TAG_PREFIX },
        },
      });
      console.log(`已清除旧演示打卡 ${deleted.count} 条（带 ${IMPORT_TAG_PREFIX} 标记）`);
    }

    let created = 0;
    for (const item of data.timeline) {
      if (append) {
        const dup = await prisma.checkin.findFirst({
          where: {
            userId: user.id,
            note: { startsWith: `${IMPORT_TAG_PREFIX}${item.id}` },
          },
        });
        if (dup) {
          console.log(`跳过（已存在）: ${item.id}`);
          continue;
        }
      }

      await prisma.checkin.create({
        data: {
          userId: user.id,
          name: buildName(item),
          address: item.placeName ?? item.city,
          lat: item.lat,
          lng: item.lng,
          country: item.country,
          province: item.province ?? "",
          city: item.city,
          district: "",
          checkinAt: checkinAtFromDate(item.dateStart),
          note: buildNote(item),
        },
      });
      created += 1;
      console.log(`+ ${item.dateLabel} ${item.city} — ${item.event}`);
    }

    const total = await prisma.checkin.count({ where: { userId: user.id } });
    console.log("");
    console.log(`完成：本次写入 ${created} 条`);
    console.log(`用户 id: ${user.id.toString()}`);
    console.log(`用户昵称: ${user.nickname}`);
    console.log(`用户 openid: ${user.openid}`);
    console.log(`该用户打卡总数: ${total}`);
    if (useDemoAccount) {
      console.log("");
      console.log("本地 dev-login：");
      console.log(`  curl -s -X POST http://localhost:3000/v1/auth/dev-login \\`);
      console.log(`    -H 'Content-Type: application/json' \\`);
      console.log(`    -d '{"openid":"${openid}","nickname":"${nickname}"}'`);
    } else {
      console.log("");
      console.log("请在该账号已登录的小程序里下拉刷新地图/足迹页查看。");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
