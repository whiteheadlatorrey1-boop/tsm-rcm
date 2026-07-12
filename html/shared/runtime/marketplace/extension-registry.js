/**
 * TSM Extension Registry
 * Central capability registration
 */

const extensions = [];

module.exports = {

register(extension){
  extensions.push(extension);

  return extension;
},

list(){
  return extensions;
}

};
