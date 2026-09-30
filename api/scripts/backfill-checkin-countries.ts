/**
 * 按坐标修正库内 country 字段（海外误标「中国」或为空）
 * 用法: npx tsx scripts/backfill-checkin-countries.ts
 */
import { PrismaClient } from '@prisma/client'
import { effectiveCheckinCountry } from '../src/utils/country.js'

const prisma = new PrismaClient()

async function main() {
  const rows = await prisma.checkin.findMany({
    select: { id: true, country: true, province: true, lat: true, lng: true },
  })

  let updated = 0
  for (const row of rows) {
    const next = effectiveCheckinCountry(row)
    if (next && next !== row.country) {
      await prisma.checkin.update({
        where: { id: row.id },
        data: { country: next },
      })
      updated += 1
    }
  }

  console.log(`扫描 ${rows.length} 条，更新 ${updated} 条 country`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
