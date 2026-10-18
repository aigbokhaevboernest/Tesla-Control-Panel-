
const BRAND = "Tesla Admin";
export const setAdminTitle = (page: string) => {
  document.title = `${BRAND} · ${page}`;
};
