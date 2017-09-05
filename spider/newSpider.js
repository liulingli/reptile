let http = require("http");
let cheerio = require("cheerio");
let fs = require("fs");
let request = require("request");
let async = require("async");
let iconv = require('iconv-lite');
let BufferHelper = require('bufferhelper');
let initUrl = "http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2016/index.html";
let url = "http://www.stats.gov.cn/tjsj/tjbz/tjyqhdmhcxhfdm/2016/";//初始url
let dataSource = [];
/**
 * @method 生成文件
 * @param fileName
 * @param text
 */
const createTxt =(fileName,text) =>{
  return new Promise((resolve,reject)=>{
    fs.appendFile("spider/data/"+fileName+".txt",text,"utf-8",function(err){
      if(err){
        console.log(err)
      }else{
        resolve(true)
      }
    })
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
/**
 * @method 获取所有省
 * @param initUrl
 * @returns {Promise.<void>}
 */
async function getProvince(initUrl) {
  console.time("计时器");
  let subUrlArray = [];
  await httpGet(initUrl).then(($)=>{
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
  //await的上下文async
 // console.log(subUrlArray)
  for(let i=0;i<subUrlArray.length;i++){
    console.log("进入"+dataSource[i].province);
    await startRequest(url,subUrlArray[i].subUrl,i);
    //根据省生成文件
    let fileName = dataSource[i].province;
    let text = JSON.stringify(dataSource[i].cityArray);
    await createTxt(fileName,text);
  }

  console.timeEnd("计时器");
}
/**
 * @method 根据省查询该省下面的所有市
 * @param url
 * @param subUrl
 * @param i
 * @returns {Promise}
 */
async function startRequest(url,subUrl,i){
  let subUrlArray = [];
  await httpGet(url+subUrl).then(($)=>{
    let citytr = $(".citytr");
    //保存省市和地址
    citytr.each(function(index){
      let cityNum = $(this).find("td").eq(0).find("a").text();
      let name = $(this).find("td").eq(1).find("a").text();
      let cityUrl = $(this).find("td").eq(0).find("a").attr("href");
      dataSource[i]["cityArray"].push({
        city : name,
        cityNum : cityNum,
        countryArray : []
      });
      //将函数参数放入队列
      let countryUrl = url.replace(/.html/,"");
      subUrlArray.push({
        countryUrl: countryUrl,
        subUrl: cityUrl,
      });
    });
  });
  for(let j=0;j<subUrlArray.length;j++){
    let url = subUrlArray[j].countryUrl;
    let subUrl = subUrlArray[j].subUrl;
    await startCounty(url,subUrl,i,j);
  }
}
/**
 * @method 查询市区下面的区县
 * @param url
 * @param subUrl
 * @param proIndex
 * @param cityIndex
 * @returns {Promise.<void>}
 */
async function startCounty(url,subUrl,proIndex,cityIndex){
  let subUrlArray = [];
  //console.log("进入区县",url+subUrl)
  await httpGet(url+subUrl).then(($)=>{
    let countytr = $(".countytr");
    //保存区县和地址

    countytr.each(function(i){
      //console.log("区县",i)
      let countyNum = $(this).find("td").eq(0).find("a").text();
      let name = $(this).find("td").eq(1).find("a").text();
      let areaurl = $(this).find("td").eq(0).find("a").attr("href");
      dataSource[proIndex]["cityArray"][cityIndex]["countryArray"].push({
        county : name,
        countyNum : countyNum,
        areaArray : [],
      });
      let newUrl = subUrl.split(/\//)[0]+"/"+areaurl;
      if(areaurl){
        subUrlArray.push({
          newUrl : newUrl,
          index : i
        });
      }
    });
  });
  for(let i=0;i<subUrlArray.length;i++){
    let data = subUrlArray[i];
    await getTree(url,data.newUrl,proIndex,cityIndex,data.index);
  }
}
/**
 * @method 根据区县爬取街道
 * @param url
 * @param subUrl
 * @param proIndex
 * @param cityIndex
 * @param countyIndex
 * @returns {Promise.<void>}
 */
async function getTree(url,subUrl,proIndex,cityIndex,countyIndex){
  let subUrlArray = [];
  //console.log("街道",url+subUrl)
  await httpGet(url+subUrl).then(($)=>{
    let towntr = $(".towntr");
    //console.log("towntr",towntr.length)
    //保存区县和地址
    towntr.each(function(i){
      let  countyNum = $(this).find("td").eq(0).find("a").text();
      let name = $(this).find("td").eq(1).find("a").text();
      let newurl = $(this).find("td").eq(0).find("a").attr("href");
      dataSource[proIndex]["cityArray"][cityIndex]["countryArray"][countyIndex]["areaArray"].push({
        area : name,
        areaNum : countyNum,
        jwhArray : [],
      });
      let reUrl = subUrl.split(/\//)[0]+"/"+subUrl.split(/\//)[1]+"/"+newurl;
      if(newurl){
        subUrlArray.push({
          reUrl : reUrl,
          index : i
        })
      }
    });
  });
  for(let i=0;i<subUrlArray.length;i++){
    let data = subUrlArray[i];
    await getJwh(url,data.reUrl,proIndex,cityIndex,countyIndex,data.index);
  }
}
/**
 * @method 根据街道爬取办事处
 * @param url
 * @param subUrl
 * @param proIndex
 * @param cityIndex
 * @param countyIndex
 * @param areaIndex
 * @returns {Promise.<void>}
 */
async function getJwh(url,subUrl,proIndex,cityIndex,countyIndex,areaIndex){
  let subUrlArray = [];
  //console.log("getJwh",url+subUrl);
  await httpGet(url+subUrl).then(($)=>{
    let villagetr = $(".villagetr");
    //console.log(villagetr.length);
    villagetr.each(function(i){
      let  countyNum = $(this).find("td").eq(0).text();
      let name = $(this).find("td").eq(2).text();
      dataSource[proIndex]["cityArray"][cityIndex]["countryArray"][countyIndex]["areaArray"][areaIndex]["jwhArray"].push({
        jwh : name,
        jwhNum : countyNum,
      });
      //console.log("name",name)
    });
  })
}

getProvince(initUrl);