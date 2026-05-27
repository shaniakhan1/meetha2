// Allow canvas native module to build during pnpm install
function readPackage(pkg, context) {
  return pkg;
}

module.exports = {
  hooks: {
    readPackage,
  },
};
