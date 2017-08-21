var http = require("http");
var cheerio = require("cheerio");
var fs = require("fs");
var request = require("request");
var iconv = require('iconv-lite');
var BufferHelper = require('bufferhelper');
var url = "http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2016/";//初始url
var dataSource = [];
function fetchPage(page){
  startRequest(page)
}
function startRequest(page){
  if(page>65){
    return;
  }
  // 采用http模块向服务器发送get请求
  http.get(url+page+".html",function (res) {
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
      var provinceArray = [];
      citytr.each(function(i){
        var num = $(this).find("td").eq(0).find("a").text();
        var name = $(this).find("td").eq(1).find("a").text();
        var url = $(this).find("td").eq(0).find("a").attr("href");
        provinceArray.push({
          num : num,
          name : name,
          url : url,
          children :[]
        })
      });
      dataSource.push(provinceArray);
    })
  });
  fetchPage(page+1);
}
fetchPage(11);

//爬取市区下的区县
function startCounty(url){

}