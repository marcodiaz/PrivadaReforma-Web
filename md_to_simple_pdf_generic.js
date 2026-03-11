const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

const srcArg = process.argv[2]
const outArg = process.argv[3]

if (!srcArg) {
  console.error('Usage: node md_to_simple_pdf_generic.js <input.md> [output.pdf]')
  process.exit(1)
}

const src = path.resolve(srcArg)
const out = path.resolve(outArg || src.replace(/\.md$/i, '.pdf'))

const text = fs.readFileSync(src, 'utf8')
const lines = text.split(/\r?\n/).map((raw) => {
  let line = raw.replace(/^\uFEFF/, '')
  if (line.startsWith('#')) {
    line = line.replace(/^#+\s*/, '')
  }
  if (line.startsWith('- ')) {
    line = `* ${line.slice(2)}`
  }
  return line
})

const pageW = 595
const pageH = 842
const marginL = 50
const marginT = 50
const lineH = 14
const maxLines = Math.floor((pageH - marginT * 2) / lineH)

function escPdf(s) {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

function toPdfText(s) {
  return Buffer.from(s, 'latin1').toString('latin1')
}

const pages = []
let cur = []
for (let line of lines) {
  while (line.length > 100) {
    let cut = line.lastIndexOf(' ', 100)
    if (cut <= 0) cut = 100
    cur.push(line.slice(0, cut))
    line = line.slice(cut).trimStart()
    if (cur.length >= maxLines) {
      pages.push(cur)
      cur = []
    }
  }
  cur.push(line)
  if (cur.length >= maxLines) {
    pages.push(cur)
    cur = []
  }
}
if (cur.length) pages.push(cur)

const objects = []
objects.push(Buffer.from('<< /Type /Catalog /Pages 2 0 R >>', 'ascii'))
objects.push(Buffer.from('', 'ascii'))

const pageObjIds = []
const fontObjId = 3 + pages.length * 2

for (const pg of pages) {
  const contentLines = [
    'BT',
    '/F1 10 Tf',
    `1 0 0 1 ${marginL} ${pageH - marginT} Tm`,
  ]
  let first = true
  for (const lnRaw of pg) {
    const ln = toPdfText(lnRaw)
    if (first) {
      contentLines.push(`(${escPdf(ln)}) Tj`)
      first = false
    } else {
      contentLines.push(`0 -${lineH} Td (${escPdf(ln)}) Tj`)
    }
  }
  contentLines.push('ET')

  const stream = Buffer.from(contentLines.join('\n'), 'latin1')
  const compressed = zlib.deflateSync(stream)
  const header = Buffer.from(
    `<< /Length ${compressed.length} /Filter /FlateDecode >>\nstream\n`,
    'ascii',
  )
  const footer = Buffer.from('\nendstream', 'ascii')
  objects.push(Buffer.concat([header, compressed, footer]))
  const contentId = objects.length

  const pageDict = Buffer.from(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources << /Font << /F1 ${fontObjId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    'ascii',
  )
  objects.push(pageDict)
  pageObjIds.push(objects.length)
}

objects.push(Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', 'ascii'))
const kids = pageObjIds.map((id) => `${id} 0 R`).join(' ')
objects[1] = Buffer.from(
  `<< /Type /Pages /Kids [${kids}] /Count ${pageObjIds.length} >>`,
  'ascii',
)

const chunks = []
chunks.push(Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'binary'))
const offsets = [0]
let pos = chunks[0].length

for (let i = 0; i < objects.length; i += 1) {
  const n = i + 1
  offsets[n] = pos
  const objHeader = Buffer.from(`${n} 0 obj\n`, 'ascii')
  const objFooter = Buffer.from('\nendobj\n', 'ascii')
  chunks.push(objHeader, objects[i], objFooter)
  pos += objHeader.length + objects[i].length + objFooter.length
}

const xrefPos = pos
const xrefHead = Buffer.from(`xref\n0 ${objects.length + 1}\n`, 'ascii')
chunks.push(xrefHead)
pos += xrefHead.length

const free = Buffer.from('0000000000 65535 f \n', 'ascii')
chunks.push(free)
pos += free.length

for (let i = 1; i <= objects.length; i += 1) {
  const row = Buffer.from(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`, 'ascii')
  chunks.push(row)
  pos += row.length
}

const trailer = Buffer.from(
  `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`,
  'ascii',
)
chunks.push(trailer)

fs.writeFileSync(out, Buffer.concat(chunks))
console.log(out)
