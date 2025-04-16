export const isValidNickname = (nickname: string) => {
    const regex = /^[a-zA-Z0-9_]{6,17}$/;
    return regex.test(nickname);
};