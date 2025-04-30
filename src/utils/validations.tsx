export const isValidNickname = (nickname: string) => {
    const regex = /^[a-zA-Z0-9_]{3,17}$/;
    return regex.test(nickname);
};