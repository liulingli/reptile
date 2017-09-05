var http = require("http");
var cheerio = require("cheerio");
var fs = require("fs");
var request = require("request");
var async = require("async");
var iconv = require('iconv-lite');
var BufferHelper = require('bufferhelper');
var initUrl = "http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2016/index.html";
var url = "http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2016/";//初始url
var dataSource = [];

var sleep = function (time) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      // 模拟出错了，返回 ‘error’
      resolve("123");
    }, time);
  })
};
/**
 * @method promise封装http请求
 * @returns {Promise.<void>}
 */
const httpGet = (url) =>{
  return new Promise((resolve,reject)=>{
     http.get(url,(res)=>{
        let buffer = new BufferHelper();
        res.on("data",(data)=>{
          buffer.concat(data);
        });
       res.on("end",()=>{
         let buf = buffer.toBuffer();
         let html = iconv.decode(buf,'GBK');
         let $ = cheerio.load(html); //采用cheerio解析页面
         resolve($);
       })
     })
  })
};
async function getProvince(url) {
   let subUrlArray = [];
   await httpGet(url).then(($)=>{
      let provincetds = $(".provincetr td");
      provincetds.each((i)=> {
        let subUrl = provincetds.eq(i).find("a").attr("href");
        let name = provincetds.eq(i).find("a").text();
        dataSource.push({
          province: name,
          cityArray: []
        });
        //将函数参数放入队列
        subUrlArray.push({
          url: url,
          subUrl: subUrl,
          j: i
        });
      })
   });
  console.log(subUrlArray)
}
getProvince(initUrl);
async function getAllProvince(){
/*  let arr = [1,2,3,4,5,6,7,8,9,10];
  for(let v of arr){
    console.log(`当前是第${v}次等待..`);
    await sleep(1000).then((response)=>{
      console.log(response)
    })
  }*/
  /*for (var i = 1; i <= 10; i++) {
    console.log(`当前是第${i}次等待..`);
    await sleep(1000);
  }*/
  await http.get(initUrl,(res) =>{
    var html = ""; //用于保存请求的全部html
    //res.setEncoding("binary");//防止中文乱码
    var buffer = new BufferHelper();
    //监听data事件，保存每次获取的数据
    res.on("data",(data)=>{
      buffer.concat(data);
    });
    //监听end事件，如果html获取完之后，执行
    res.on("end",()=>{
      var buf = buffer.toBuffer();
      var html = iconv.decode(buf,'GBK');
      var $ = cheerio.load(html); //采用cheerio解析页面
      var provincetds = $(".provincetr td");
      //保存省市和地址
      var provinceArray = [];
      //处理异步请求
      var subUrlArray = [];
      provincetds.each((i)=>{
        var subUrl = $(this).find("a").attr("href");
        var name = $(this).find("a").text();
        dataSource.push({
          province : name,
          cityArray :[]
        });
        //将函数参数放入队列
        subUrlArray.push({
          url : url,
          subUrl :subUrl,
          j :i
        });
       startRequest(url,subUrl,i,subUrlArray);
      });
    })
  });
}
function startRequest(url,subUrl,i,subUrlArray){
  // 采用http模块向服务器发送get请求
  //console.log("加载城市",url,subUrl);
  return new Promise(function(resolve,reject){
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
        citytr.each(function(index){
          var cityNum = $(this).find("td").eq(0).find("a").text();
          var name = $(this).find("td").eq(1).find("a").text();
          var cityUrl = $(this).find("td").eq(0).find("a").attr("href");
          dataSource[i]["cityArray"].push({
            city : name,
            cityNum : cityNum,
            countryArray : []
          });
          var countryUrl = url.replace(/.html/,"");
          startCounty(countryUrl,cityUrl,i,index);
          resolve();
        });
      });
    });
  })
}
getAllProvince();
//爬取市区下的区县
async function startCounty(url,subUrl,proIndex,cityIndex){
  // 采用http模块向服务器发送get请求
  console.log("加载区县",url,subUrl)
  await http.get(url+subUrl,function (res) {
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
        var areaurl = $(this).find("td").eq(0).find("a").attr("href");
        dataSource[proIndex]["cityArray"][cityIndex]["countryArray"].push({
          county : name,
          countyNum : countyNum,
          areaArray : [],
        });
        var newUrl = subUrl.split(/\//)[0]+"/"+areaurl
        if(areaurl){
          //console.log(url,newUrl,areaurl)
          getTree(url,newUrl,proIndex,cityIndex,i)
        }
      });
    });
  });
}
/** 爬取街道 **/
async function getTree(url,subUrl,proIndex,cityIndex,countyIndex){
  // 采用http模块向服务器发送get请求
  //sconsole.log("加载街道",url+subUrl)
  await http.get(url+subUrl,function (res) {
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
      var towntr = $(".towntr");
      //console.log("towntr",towntr)
      //保存区县和地址
      towntr.each(function(i){
        var  countyNum = $(this).find("td").eq(0).find("a").text();
        var name = $(this).find("td").eq(1).find("a").text();
        var newurl = $(this).find("td").eq(0).find("a").attr("href");
        dataSource[proIndex]["cityArray"][cityIndex]["countryArray"][countyIndex]["areaArray"].push({
          area : name,
          areaNum : countyNum,
          jwhArray : [],
        });
        var reUrl = subUrl.split(/\//)[0]+"/"+subUrl.split(/\//)[0]+"/"+newurl;
        console.log(url,reUrl)
        getJwh(url,reUrl,proIndex,cityIndex,countyIndex,i);
      });
    });
  });
}
/** 爬取办事处 **/
async function getJwh(url,subUrl,proIndex,cityIndex,countyIndex,areaIndex){
// 采用http模块向服务器发送get请求
  console.log("加载办事处",url,subUrl)
  await http.get(url+subUrl,function (res) {
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
    //console.log(dataSource[i])
   // createTxt(dataSource[i].province,dataSource[i].toString());
  }
},60000);
 /*生成文件*/
function createTxt(fileName,text){
  fs.appendFile("data/"+fileName+".txt",text,"utf-8",function(err){
    if(err){
      console.log(err)
    }
  })
}