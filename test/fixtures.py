# Generates the test images used by smoke.js (no dependencies).
import zlib, struct, math, sys

def png(path, w, h, px):
    raw = b''.join(b'\x00' + bytes(px[y*w*4:(y+1)*w*4]) for y in range(h))
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    out = b'\x89PNG\r\n\x1a\n'
    out += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    out += chunk(b'IDAT', zlib.compress(raw, 6))
    out += chunk(b'IEND', b'')
    open(path, 'wb').write(out)

W, H = 400, 300
px = bytearray(W*H*4)
for y in range(H):
    for x in range(W):
        i = (y*W+x)*4
        # flat white background (to exercise the wand)
        r, g, b, a = 255, 255, 255, 255
        dx, dy = x-150, y-150
        d = math.hypot(dx, dy)
        if d < 90:                      # magenta circle with a soft edge
            t = min(1.0, max(0.0, (90-d)/3))
            r, g, b = int(255*(1-t)+229*t), int(255*(1-t)+0*t), int(255*(1-t)+109*t)
        if 240 < x < 350 and 60 < y < 240:   # cyan block
            r, g, b = 0, 163, 196
        if 120 < x < 180 and 200 < y < 280:  # dark block
            r, g, b = 30, 28, 26
        if x < 6 or y < 6:              # stray specks to exercise cleanup
            if (x*y) % 37 == 0: r, g, b = 0, 0, 0
        px[i:i+4] = bytes((r, g, b, a))
png(sys.argv[1] if len(sys.argv)>1 else 'test.png', W, H, px)


# second image: PNG with transparency and a white halo (a dirty cutout)
px2 = bytearray(W*H*4)
for y in range(H):
    for x in range(W):
        i = (y*W+x)*4
        d = math.hypot(x-200, y-150)
        if d < 110:
            a = 255 if d < 104 else int(255*max(0.0,(110-d)/6))
            # white halo on the edge
            if d > 96:
                r, g, b = 250, 250, 250
            else:
                r, g, b = 240, 176, 30
            px2[i:i+4] = bytes((r, g, b, a))
png('cutout.png', W, H, px2)
