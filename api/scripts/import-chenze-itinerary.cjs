/**
 * Node 可直接运行（生产容器内无 tsx 时用）：
 *   node scripts/import-chenze-itinerary.cjs --user-id=2
 * JSON 默认 ../../marketing/chenze-itinerary.json
 */
const { readFileSync, existsSync } = require("node:fs");
const { join, dirname } = require("node:path");
const { PrismaClient } = require("@prisma/client");

const IMPORT_TAG_PREFIX = "#chenze-import:";
const DEMO_OPENID = "demo_chenze_footprint";
const DEMO_NICKNAME = "陈泽·足迹演示";

function parseArgs(argv) {
  const userId = argv.find((a) => a.startsWith("--user-id="))?.split("=")[1];
  const nicknameTarget = argv.find((a) => a.startsWith("--nickname="))?.split("=")[1];
  const openidTarget = argv.find((a) => a.startsWith("--openid="))?.split("=")[1];
  const jsonPath = argv.find((a) => a.startsWith("--json="))?.split("=")[1];
  const useDemoAccount = !userId && !nicknameTarget && !openidTarget;
  return {
    append: argv.includes("--append"),
    userId,
    nicknameTarget,
    openidTarget,
    jsonPath,
    useDemoAccount,
    openid: openidTarget ?? DEMO_OPENID,
    nickname: useDemoAccount ? DEMO_NICKNAME : undefined,
  };
}

function resolveJsonPath(args) {
  if (args.jsonPath) return args.jsonPath;
  const fromScript = join(__dirname, "../../marketing/chenze-itinerary.json");
  if (existsSync(fromScript)) return fromScript;
  if (existsSync("/tmp/chenze-itinerary.json")) return "/tmp/chenze-itinerary.json";
  throw new Error("找不到 chenze-itinerary.json，请用 --json= 指定");
}

function checkinAtFromDate(dateStart) {
  return new Date(`${dateStart}T12:00:00+08:00`);
}

function buildName(item) {
  if (item.placeName) return `${item.city} · ${item.placeName}`;
  return `${item.city}｜${item.event}`;
}

function buildNote(item) {
  const lines = [`${IMPORT_TAG_PREFIX}${item.id}`, `时间：${item.dateLabel}`, item.event];
  if (item.companions?.length) lines.push(`同行：${item.companions.join("、")}`);
  if (item.tags?.length) lines.push(`标签：${item.tags.join(" · ")}`);
  if (item.source) lines.push(`来源：${item.source}`);
  if (item.note) lines.push(item.note);
  return lines.join("\n");
}

async function resolveUser(prisma, args) {
  if (args.userId) {
    const user = await prisma.user.findUnique({ where: { id: BigInt(args.userId) } });
    if (!user) throw new Error(`未找到 user-id=${args.userId}`);
    return user;
  }
  if (args.nicknameTarget) {
    const users = await prisma.user.findMany({
      where: { nickname: { contains: args.nicknameTarget } },
      orderBy: { id: "desc" },
    });
    if (!users.length) {
      throw new Error(`未找到昵称包含「${args.nicknameTarget}」的用户`);
    }
    if (users.length > 1) {
      for (const u of users) {
        console.error(`  id=${u.id.toString()} nickname=${u.nickname}`);
      }
      throw new Error("昵称不唯一，请用 --user-id=");
    }
    return users[0];
  }
  if (args.openidTarget) {
    const user = await prisma.user.findUnique({ where: { openid: args.openidTarget } });
    if (!user) throw new Error(`未找到 openid=${args.openidTarget}`);
    return user;
  }
  return prisma.user.upsert({
    where: { openid: DEMO_OPENID },
    update: { nickname: DEMO_NICKNAME },
    create: { openid: DEMO_OPENID, nickname: DEMO_NICKNAME },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const raw = readFileSync(resolveJsonPath(args), "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data.timeline) || !data.timeline.length) {
    throw new Error("timeline 为空");
  }

  const prisma = new PrismaClient();
  try {
    const user = await resolveUser(prisma, args);
    if (!args.append) {
      const deleted = await prisma.checkin.deleteMany({
        where: { userId: user.id, note: { startsWith: IMPORT_TAG_PREFIX } },
      });
      console.log(`已清除旧陈泽导入 ${deleted.count} 条`);
    }

    let created = 0;
    for (const item of data.timeline) {
      if (args.append) {
        const dup = await prisma.checkin.findFirst({
          where: {
            userId: user.id,
            note: { startsWith: `${IMPORT_TAG_PREFIX}${item.id}` },
          },
        });
        if (dup) {
          console.log(`跳过: ${item.id}`);
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
      console.log(`+ ${item.dateLabel} ${item.city}`);
    }

    const total = await prisma.checkin.count({ where: { userId: user.id } });
    console.log(`完成 ${created} 条 → 用户 ${user.nickname || user.id}（id=${user.id}），共 ${total} 条打卡`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
