function deco(option?: string) {
  var arg = arguments;
  
  return function(target: Function){
    
  };
};

@deco("class")
class Sample {
  
  @deco("prop")
  message: string;

  @deco("method")
  greeting(@deco("param") p: string): void {}

  @deco("static")
  static sayHello(): void {}
}