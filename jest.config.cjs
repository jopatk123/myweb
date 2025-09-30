process.env.NODE_OPTIONS = process.env.NODE_OPTIONS
  ? `${process.env.NODE_OPTIONS} --experimental-vm-modules`
  : '--experimental-vm-modules';

module.exports = {
  projects: ['<rootDir>/server'],
  testPathIgnorePatterns: ['/client/'],
};
