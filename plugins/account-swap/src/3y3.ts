export const encode = (text: string) => {
    const codePoints = [...text].map((c) => c.codePointAt(0));

    const output = [];
    for (const char of codePoints) {
        output.push(
            String.fromCodePoint(
                char + (0x00 < char && char < 0x7f ? 0xe0000 : 0),
            ).toString(),
        );
    }

    return output.join("");
};

export const decode = (text: string) => {
    const codePoints = [...text].map((c) => c.codePointAt(0));

    const output = [];
    for (const char of codePoints) {
        output.push(
            String.fromCodePoint(
                char - (0xe0000 < char && char < 0xe007f ? 0xe0000 : 0),
            ).toString(),
        );
    }

    return output.join("");
};

export const detect = (text: string) => {
    const codePoints = [...text].map((c) => c.codePointAt(0));
    return codePoints.some((c) => 0xe0000 < c && c < 0xe007f);
};
