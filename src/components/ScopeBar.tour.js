// Shown the first time someone opens a page with the global "Viewing" scope bar.
export const SCOPE_TOUR = {
  id: 'scope',
  steps: [
    {
      target: 'scope-bar',
      title: 'Choose what you are looking at',
      body: 'Pick a portfolio, program or project here and every module shows just that part until you press Reset. It stays as you move between pages.',
    },
    {
      target: 'page-filters',
      title: 'Page filters narrow further',
      body: 'The filters on each page only change that page, inside the Viewing choice above. They never change it.',
    },
  ],
};
