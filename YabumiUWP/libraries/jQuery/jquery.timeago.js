﻿/**
 * Timeago is a jQuery plugin that makes it easy to support automatically
 * updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
 *
 * @name timeago
 * @version 1.4.3
 * @requires jQuery v1.2.3+
 * @author Ryan McGeary
 * @license MIT License - http://www.opensource.org/licenses/mit-license.php
 *
 * For usage and examples, visit:
 * http://timeago.yarp.com/
 *
 * Copyright (c) 2008-2015, Ryan McGeary (ryan -[at]- mcgeary [*dot*] org)
 */

(function(b){"function"===typeof define&&define.amd?define(["jquery"],b):"object"===typeof module&&"object"===typeof module.exports?b(require("jquery")):b(jQuery)})(function(b){function h(){if(!b.contains(document.documentElement,this))return b(this).timeago("dispose"),this;var a;a=b(this);if(!a.data("timeago")){a.data("timeago",{datetime:e.datetime(a)});var c=b.trim(a.text());e.settings.localeTitle?a.attr("title",a.data("timeago").datetime.toLocaleString()):!(0<c.length)||e.isTime(a)&&a.attr("title")||
a.attr("title",c)}a=a.data("timeago");c=e.settings;isNaN(a.datetime)||(0==c.cutoff||Math.abs(n(a.datetime))<c.cutoff)&&b(this).text(f(a.datetime));return this}function f(a){return e.inWords(n(a))}function n(a){return(new Date).getTime()-a.getTime()}b.timeago=function(a){return a instanceof Date?f(a):"string"===typeof a?f(b.timeago.parse(a)):"number"===typeof a?f(new Date(a)):f(b.timeago.datetime(a))};var e=b.timeago;b.extend(b.timeago,{settings:{refreshMillis:6E4,allowPast:!0,allowFuture:!1,localeTitle:!1,
cutoff:0,strings:{prefixAgo:null,prefixFromNow:null,suffixAgo:"ago",suffixFromNow:"from now",inPast:"any moment now",seconds:"less than a minute",minute:"about a minute",minutes:"%d minutes",hour:"about an hour",hours:"about %d hours",day:"a day",days:"%d days",month:"about a month",months:"%d months",year:"about a year",years:"%d years",wordSeparator:" ",numbers:[]}},inWords:function(a){function c(c,e){return(b.isFunction(c)?c(e,a):c).replace(/%d/i,d.numbers&&d.numbers[e]||e)}if(!this.settings.allowPast&&
!this.settings.allowFuture)throw"timeago allowPast and allowFuture settings can not both be set to false.";var d=this.settings.strings,e=d.prefixAgo,f=d.suffixAgo;this.settings.allowFuture&&0>a&&(e=d.prefixFromNow,f=d.suffixFromNow);if(!this.settings.allowPast&&0<=a)return this.settings.strings.inPast;var k=Math.abs(a)/1E3,g=k/60,m=g/60,l=m/24,h=l/365,k=45>k&&c(d.seconds,Math.round(k))||90>k&&c(d.minute,1)||45>g&&c(d.minutes,Math.round(g))||90>g&&c(d.hour,1)||24>m&&c(d.hours,Math.round(m))||42>m&&
c(d.day,1)||30>l&&c(d.days,Math.round(l))||45>l&&c(d.month,1)||365>l&&c(d.months,Math.round(l/30))||1.5>h&&c(d.year,1)||c(d.years,Math.round(h)),g=d.wordSeparator||"";void 0===d.wordSeparator&&(g=" ");return b.trim([e,k,f].join(g))},parse:function(a){a=b.trim(a);a=a.replace(/\.\d+/,"");a=a.replace(/-/,"/").replace(/-/,"/");a=a.replace(/T/," ").replace(/Z/," UTC");a=a.replace(/([\+\-]\d\d)\:?(\d\d)/," $1$2");a=a.replace(/([\+\-]\d\d)$/," $100");return new Date(a)},datetime:function(a){a=e.isTime(a)?
b(a).attr("datetime"):b(a).attr("title");return e.parse(a)},isTime:function(a){return"time"===b(a).get(0).tagName.toLowerCase()}});var p={init:function(){var a=b.proxy(h,this);a();var c=e.settings;0<c.refreshMillis&&(this._timeagoInterval=setInterval(a,c.refreshMillis))},update:function(a){a=e.parse(a);b(this).data("timeago",{datetime:a});e.settings.localeTitle&&b(this).attr("title",a.toLocaleString());h.apply(this)},updateFromDOM:function(){b(this).data("timeago",{datetime:e.parse(e.isTime(this)?
b(this).attr("datetime"):b(this).attr("title"))});h.apply(this)},dispose:function(){this._timeagoInterval&&(window.clearInterval(this._timeagoInterval),this._timeagoInterval=null)}};b.fn.timeago=function(a,b){var d=a?p[a]:p.init;if(!d)throw Error("Unknown function name '"+a+"' for timeago");this.each(function(){d.call(this,b)});return this};document.createElement("abbr");document.createElement("time")});