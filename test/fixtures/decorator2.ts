function classdeco(option: string) {
  
  return function(target: any): void{
    
  };
};

function methodPropDeco(option: string){
  return function(target, key, descriptor): void{
    
  }
}

function propDeco(option: string){
  return function(target, index): void{
    
  }
}


@classdeco("class")
class Sample {
  
  @propDeco("prop")
  message: string;

  @methodPropDeco("method")
  greeting(p: string): void {}

  @methodPropDeco("static")
  static sayHello(): void {}
}
