var http = require("http");
var cheerio = require("cheerio");
var fs = require("fs");
var request = require("request");
var iconv = require('iconv-lite');
var BufferHelper = require('bufferhelper');
var initUrl = "http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2016/index.html";
var url = "http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2016/";//初始url
var dataSource = [];
var cityArray = [];
function getAllProvince(){
  http.get(initUrl,function (res) {
    var html = ""; //用于保存请求的全部html
    //res.setEncoding("binary");//防止中文乱码
    var buffer = new BufferHelper();
    //监听data事件，保存每次获取的数据
    res.on("data",function(data){
      buffer.concat(data);
    });
    //监听end事件，如果html获取完之后，执行
    res.on("end",function(){
      var buf = buffer.toBuffer();
      var html = iconv.decode(buf,'GBK');
      var $ = cheerio.load(html); //采用cheerio解析页面
      var provincetr = $(".provincetr");
      //保存省市和地址
      var provinceArray = [];
      provincetr.each(function(i){
        $(this).find("td").each(function(j){
          var subUrl = $(this).find("a").attr("href");
          var name = $(this).find("a").text();
          dataSource.push({
            province : name,
            cityArray :[]
          });
          startRequest(url,subUrl,i);
        });
      });
    })
  });
}
function startRequest(url,subUrl,index){
  // 采用http模块向服务器发送get请求
  http.get(url+subUrl,function (res) {
    var html = ""; //用于保存请求的全部html
    //res.setEncoding("binary");//防止中文乱码
    var buffer = new BufferHelper();
    //监听data事件，保存每次获取的数据
    res.on("data",function(data){
      //html += data;
      buffer.concat(data);
    });
    //监听end事件，如果html获取完之后，执行
    res.on("end",function(){
      var buf = buffer.toBuffer();
      var html = iconv.decode(buf,'GBK');
      var $ = cheerio.load(html); //采用cheerio解析页面
      var citytr = $(".citytr");
      //保存省市和地址
      citytr.each(function(i){
        var cityNum = $(this).find("td").eq(0).find("a").text();
        var name = $(this).find("td").eq(1).find("a").text();
        var cityUrl = $(this).find("td").eq(0).find("a").attr("href");
        dataSource[index]["cityArray"].push({
          city : name,
          cityNum : cityNum,
          countryArray : []
        });
        var countryUrl = url.replace(/.html/,"");
        startCounty(countryUrl,cityUrl,index,i)
      });
    });
  });
}
getAllProvince();
//爬取市区下的区县
function startCounty(url,subUrl,proIndex,cityIndex){
  // 采用http模块向服务器发送get请求
  //console.log(url+subUrl);
  http.get(url+subUrl,function (res) {
    var html = ""; //用于保存请求的全部html
    //res.setEncoding("binary");//防止中文乱码
    var buffer = new BufferHelper();
    //监听data事件，保存每次获取的数据
    res.on("data",function(data){
      //html += data;
      buffer.concat(data);
    });
    //监听end事件，如果html获取完之后，执行
    res.on("end",function(){
      var buf = buffer.toBuffer();
      var html = iconv.decode(buf,'GBK');
      var $ = cheerio.load(html); //采用cheerio解析页面
      var countytr = $(".countytr");
      //保存区县和地址
      countytr.each(function(i){
        var  countyNum = $(this).find("td").eq(0).find("a").text();
        var name = $(this).find("td").eq(1).find("a").text();
        var url = $(this).find("td").eq(0).find("a").attr("href");
        dataSource[proIndex]["cityArray"][cityIndex]["countryArray"].push({
          county : name,
          countyNum : countyNum,
          areaArray : [],
        });
      });
    });
  });
}
/** 爬取街道 **/
function getTree(url,subUrl,proIndex,cityIndex,countyIndex){
  // 采用http模块向服务器发送get请求
  //console.log(url+subUrl);
  http.get(url+subUrl,function (res) {
    var html = ""; //用于保存请求的全部html
    //res.setEncoding("binary");//防止中文乱码
    var buffer = new BufferHelper();
    //监听data事件，保存每次获取的数据
    res.on("data",function(data){
      //html += data;
      buffer.concat(data);
    });
    //监听end事件，如果html获取完之后，执行
    res.on("end",function(){
      var buf = buffer.toBuffer();
      var html = iconv.decode(buf,'GBK');
      var $ = cheerio.load(html); //采用cheerio解析页面
      var towntr = $(".countytr");
      //保存区县和地址
      towntr.each(function(i){
        var  countyNum = $(this).find("td").eq(0).find("a").text();
        var name = $(this).find("td").eq(1).find("a").text();
        var url = $(this).find("td").eq(0).find("a").attr("href");
        dataSource[proIndex]["cityArray"][cityIndex]["countryArray"][countyIndex]["areaArray"].push({
          area : name,
          areaNum : countyNum,
          jwhArray : [],
        });
        getJwh(url,subUrl,proIndex,cityIndex,countyIndex,i);
      });
    });
  });
}
/** 爬取办事处 **/
function getJwh(url,subUrl,proIndex,cityIndex,countyIndex,areaIndex){
// 采用http模块向服务器发送get请求
  //console.log(url+subUrl);
  http.get(url+subUrl,function (res) {
    var html = ""; //用于保存请求的全部html
    //res.setEncoding("binary");//防止中文乱码
    var buffer = new BufferHelper();
    //监听data事件，保存每次获取的数据
    res.on("data",function(data){
      //html += data;
      buffer.concat(data);
    });
    //监听end事件，如果html获取完之后，执行
    res.on("end",function(){
      var buf = buffer.toBuffer();
      var html = iconv.decode(buf,'GBK');
      var $ = cheerio.load(html); //采用cheerio解析页面
      var villagetr = $(".villagetr");
      //保存区县和地址
      villagetr.each(function(i){
        var  countyNum = $(this).find("td").eq(0).find("a").text();
        var name = $(this).find("td").eq(2).find("a").text();
        dataSource[proIndex]["cityArray"][cityIndex]["countryArray"][countyIndex]["areaArray"][areaIndex]["jwhArray"].push({
          jwh : name,
          jwhNum : countyNum,
        });
      });
    });
  });
}
setTimeout(function(){
  console.log("dataSource",dataSource)
  console.log("长度",dataSource,dataSource.length)
  for(var i=0;i<dataSource.length;i++){
    console.log(dataSource[i])
  }
},100000);
 /*生成文件*/
function createTxt(fileName,text){
  fs.appendFile("./data/"+fileName+".txt",text,"utf-8",function(err){
    if(err){
      console.log(err)
    }
  })
}