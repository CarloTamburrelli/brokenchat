export const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", { year: "numeric", month: "long", day: "2-digit" });
};
  