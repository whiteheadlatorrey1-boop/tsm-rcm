
// TSM Solution Packager

const solutionPackager = {
  package(solution){
    return {
      packageId:"TSM-PACKAGE-" + Date.now(),
      solution,
      status:"READY"
    };
  }
};

module.exports = solutionPackager;
