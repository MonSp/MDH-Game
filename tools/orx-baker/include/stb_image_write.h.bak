#ifndef INCLUDE_STB_IMAGE_WRITE_H
#define INCLUDE_STB_IMAGE_WRITE_H

#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include <math.h>

#ifndef STBIWDEF
#ifdef __cplusplus
#define STBIWDEF extern "C"
#else
#define STBIWDEF extern
#endif
#endif

typedef unsigned char stbiw_uc;
typedef unsigned short stbiw_us;

STBIWDEF int stbi_write_png(char const *filename, int w, int h, int comp, const void *data, int stride_in_bytes);

#ifdef STB_IMAGE_WRITE_IMPLEMENTATION

static void stbiw__write_dynamic(FILE *f, int v) {
    unsigned char d[4] = {
        (unsigned char)((v >> 24) & 0xFF),
        (unsigned char)((v >> 16) & 0xFF),
        (unsigned char)((v >> 8) & 0xFF),
        (unsigned char)(v & 0xFF)
    };
    fwrite(d, 1, 4, f);
}

static void stbiw__write4(FILE *f, unsigned char a, unsigned char b, unsigned char c, unsigned char d) {
    unsigned char buf[4] = {a, b, c, d};
    fwrite(buf, 1, 4, f);
}

static unsigned long stbiw__adler32(unsigned long adler, const unsigned char *ptr, size_t len) {
    unsigned long s1 = adler & 0xffff;
    unsigned long s2 = (adler >> 16) & 0xffff;
    while (len--) {
        s1 = (s1 + *ptr++) % 65521;
        s2 = (s2 + s1) % 65521;
    }
    return (s2 << 16) | s1;
}

static void stbiw__write_png_header(FILE *f, int w, int h, int comp) {
    unsigned char signature[8] = {137, 80, 78, 71, 13, 10, 26, 10};
    fwrite(signature, 1, 8, f);

    stbiw__write_dynamic(f, 13);
    stbiw__write4(f, 'I', 'H', 'D', 'R');
    stbiw__write_dynamic(f, w);
    stbiw__write_dynamic(f, h);
    unsigned char bit_depth = 8;
    unsigned char color_type = 0;
    if (comp == 1) color_type = 0;
    else if (comp == 2) color_type = 4;
    else if (comp == 3) color_type = 2;
    else if (comp == 4) color_type = 6;
    fwrite(&bit_depth, 1, 1, f);
    fwrite(&color_type, 1, 1, f);
    unsigned char z[3] = {0, 0, 0};
    fwrite(z, 1, 3, f);
}

static unsigned long stbiw__crc_table[256];
static int stbiw__crc_table_computed = 0;

static void stbiw__make_crc_table(void) {
    for (int n = 0; n < 256; n++) {
        unsigned long c = (unsigned long)n;
        for (int k = 0; k < 8; k++) {
            if (c & 1) c = 0xedb88320L ^ (c >> 1);
            else c = c >> 1;
        }
        stbiw__crc_table[n] = c;
    }
    stbiw__crc_table_computed = 1;
}

static unsigned long stbiw__crc(const unsigned char *buffer, int len) {
    unsigned long c = 0xffffffffL;
    if (!stbiw__crc_table_computed) stbiw__make_crc_table();
    for (int n = 0; n < len; n++) {
        c = stbiw__crc_table[(c ^ buffer[n]) & 0xff] ^ (c >> 8);
    }
    return c ^ 0xffffffffL;
}

static void stbiw__write_png_chunk(FILE *f, const char *type, const unsigned char *data, int len) {
    stbiw__write_dynamic(f, len);
    unsigned long crc = 0;
    if (!stbiw__crc_table_computed) stbiw__make_crc_table();
    unsigned char type_buf[4];
    memcpy(type_buf, type, 4);
    fwrite(type_buf, 1, 4, f);
    crc = stbiw__crc(type_buf, 4);
    if (data && len > 0) {
        fwrite(data, 1, len, f);
        crc = stbiw__crc(data, len);
    }
    stbiw__write_dynamic(f, crc ^ 0xffffffffL);
}

STBIWDEF int stbi_write_png(char const *filename, int w, int h, int comp, const void *data, int stride_in_bytes) {
    FILE *f = fopen(filename, "wb");
    if (!f) return 0;

    stbiw__write_png_header(f, w, h, comp);

    int raw_row_size = 1 + w * comp;
    int filter_row_size = raw_row_size;
    unsigned char *row = (unsigned char *)malloc((size_t)filter_row_size);
    if (!row) { fclose(f); return 0; }

    unsigned long adler = 1;
    unsigned char zlib_header[2] = {0x78, 0x01};
    fwrite(zlib_header, 1, 2, f);

    const unsigned char *pixels = (const unsigned char *)data;
    for (int y = 0; y < h; y++) {
        row[0] = 0;
        memcpy(row + 1, pixels + y * stride_in_bytes, (size_t)(w * comp));
        fwrite(row, 1, (size_t)filter_row_size, f);
    }

    unsigned long total = (unsigned long)(filter_row_size) * h;
    adler = stbiw__adler32(1, row, (size_t)filter_row_size);
    free(row);

    for (int i = 0; i < (int)total; i++) {
        (void)adler;
    }

    stbiw__write_dynamic(f, (int)((adler >> 24) & 0xFF) | (int)((adler >> 8) & 0xFF00));
    stbiw__write_dynamic(f, (int)((adler << 8) & 0xFF0000) | (int)(adler & 0xFF));

    unsigned char iend_crc_data[0];
    stbiw__write_png_chunk(f, "IEND", iend_crc_data, 0);

    fclose(f);
    return 1;
}

#endif
#endif
