import sys
import zlib
from pathlib import Path

if len(sys.argv) < 2:
    print('Usage: python md_to_simple_pdf_generic.py <input.md> [output.pdf]')
    raise SystemExit(1)

src = Path(sys.argv[1])
out = Path(sys.argv[2]) if len(sys.argv) > 2 else src.with_suffix('.pdf')

text = src.read_text(encoding='utf-8')
lines = []
for raw in text.splitlines():
    line = raw.strip('\ufeff')
    if line.startswith('#'):
        line = line.lstrip('#').strip()
    if line.startswith('- '):
        line = '* ' + line[2:]
    lines.append(line)

page_w, page_h = 595, 842
margin_l, margin_t = 50, 50
line_h = 14
max_lines = int((page_h - 2 * margin_t) / line_h)

def esc(s: str) -> str:
    return s.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

pages = []
cur = []
for line in lines:
    while len(line) > 100:
        cut = line.rfind(' ', 0, 100)
        if cut <= 0:
            cut = 100
        cur.append(line[:cut])
        line = line[cut:].lstrip()
        if len(cur) >= max_lines:
            pages.append(cur)
            cur = []
    cur.append(line)
    if len(cur) >= max_lines:
        pages.append(cur)
        cur = []
if cur:
    pages.append(cur)

objects = []
objects.append(b'<< /Type /Catalog /Pages 2 0 R >>')
objects.append(b'')
page_obj_ids = []
font_obj_id = 3 + len(pages) * 2

for pg in pages:
    content_lines = [b'BT', b'/F1 10 Tf', f'1 0 0 1 {margin_l} {page_h - margin_t} Tm'.encode('ascii')]
    first = True
    for ln in pg:
        enc = ln.encode('cp1252', errors='replace').decode('cp1252')
        if first:
            content_lines.append(f'({esc(enc)}) Tj'.encode('cp1252', errors='replace'))
            first = False
        else:
            content_lines.append(f'0 -{line_h} Td ({esc(enc)}) Tj'.encode('cp1252', errors='replace'))
    content_lines.append(b'ET')
    stream = b'\n'.join(content_lines)
    cdata = zlib.compress(stream)
    cobj = f'<< /Length {len(cdata)} /Filter /FlateDecode >>\nstream\n'.encode('ascii') + cdata + b'\nendstream'
    objects.append(cobj)
    content_id = len(objects)

    page_dict = (
        f'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {page_w} {page_h}] '
        f'/Resources << /Font << /F1 {font_obj_id} 0 R >> >> '
        f'/Contents {content_id} 0 R >>'
    ).encode('ascii')
    objects.append(page_dict)
    page_obj_ids.append(len(objects))

objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
kids = ' '.join(f'{pid} 0 R' for pid in page_obj_ids)
objects[1] = f'<< /Type /Pages /Kids [{kids}] /Count {len(page_obj_ids)} >>'.encode('ascii')

pdf = bytearray()
pdf.extend(b'%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')
offsets = [0]
for i, obj in enumerate(objects, start=1):
    offsets.append(len(pdf))
    pdf.extend(f'{i} 0 obj\n'.encode('ascii'))
    pdf.extend(obj)
    pdf.extend(b'\nendobj\n')

xref_pos = len(pdf)
pdf.extend(f'xref\n0 {len(objects)+1}\n'.encode('ascii'))
pdf.extend(b'0000000000 65535 f \n')
for i in range(1, len(objects)+1):
    pdf.extend(f'{offsets[i]:010d} 00000 n \n'.encode('ascii'))

pdf.extend(f'trailer\n<< /Size {len(objects)+1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n'.encode('ascii'))
out.write_bytes(pdf)
print(str(out.resolve()))
