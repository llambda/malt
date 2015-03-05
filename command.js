function Command() {
  if (! this instanceof Command) 
    return new Command;
  this.result = undefined;
  this.error = undefined;
  this.id = undefined;
}

module.exports.command = Command;
