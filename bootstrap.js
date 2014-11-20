const {interfaces: Ci,	utils: Cu} = Components;
const self = {
	name: 'Listen on Repeat Youtube Video Repeater',
	id: 'Listen-on-Repeat-Youtube-Video-Repeater@jetpack',
	path: {
		chrome: 'chrome://listen-on-repeat-youtube-video-repeater/content/'
	},
	aData: 0
};

Cu.import('resource://gre/modules/Services.jsm');
const ignoreFrames = false;
const hostPattern = 'youtube.com'; //if a page load matches this host it will inject into it
//check onStateChange for aRequest.name to have youtube.com in it and for STATE_STOP flag then addDiv
function addDiv(theDoc) {
	console.log('addDiv host = ' + theDoc.location.host);
	if (!theDoc) { console.log('no doc!'); return 0; } //document not provided, it is undefined likely
	if(!(theDoc.location && theDoc.location.host.indexOf(hostPattern) > -1)) { console.log('location not match host:' + theDoc.location.host); return false; }
	//if (!theDoc instanceof Ci.nsIDOMHTMLDocument) { console.log('not html doc'); return; } //not html document, so its likely an xul document //you probably dont need this check, checking host is enought
	//console.log('host pass');

	var alreadyThere = theDoc.getElementById(self.id + '.repeat');
	if (alreadyThere) {
		console.warn('alreadyThere');
		return -1;
	}

	var el_action_bar = theDoc.getElementById('watch8-secondary-actions');
	if (!el_action_bar) { console.warn('no action bar found'); return 0; }
	
	removeDiv(theDoc, true); //remove my div if it was already there, this is just a precaution
	
	//add your stuff here
	var el_btn_contents = el_action_bar.getElementsByClassName('yt-uix-button-content');
	if (!el_btn_contents) { console.warn('no buttons found'); return 0; }

	for (var i=0; i<el_btn_contents.length; i++) {
	  if (el_btn_contents[i].textContent == 'Share ') {
		var el_share_btn_contents = el_btn_contents[i];
		break;
	  }
	}
	if (!el_share_btn_contents) { console.warn('no share button contents found'); return 0; }

	var el_share_span = el_share_btn_contents;
	for (var i=0; i<5; i++) {
	  el_share_span = el_share_span.parentNode;
	  if (el_share_span.tagName == 'BUTTON') {
		el_share_span = el_share_span.parentNode;
		break;
	  }
	}
	if (el_share_span.tagName != 'SPAN') { console.warn('no share button found'); return 0; }

	console.log('FOUND:' + el_share_span.innerHTML);

	var el_lor_span = el_share_span.cloneNode(true);
	var el_lor_icon = el_lor_span.querySelector('.yt-uix-button-icon');
	var el_lor_content = el_lor_span.querySelector('[class*="button-content"]');
	el_lor_span.setAttribute('id', self.id + '.repeat');
	//el_lor_span.childNodes[0] is the BUTTON tagName
	el_lor_span.childNodes[0].setAttribute('data-tooltip-text', 'Repeat at ListenOnRepeat.com');
	el_lor_span.childNodes[0].removeAttribute('data-trigger-for');
	el_lor_span.childNodes[0].setAttribute('onclick', 'window.location = window.location.href.replace(\'youtube.com\',\'listenonrepeat.com\')');
	el_lor_span.childNodes[0].setAttribute('onmouseenter', 'this.style.opacity=1');
	el_lor_span.childNodes[0].setAttribute('onmouseleave', 'this.style.opacity=\'\'');
	el_lor_icon.style.background = 'url("' + self.path.chrome + 'icon.png") no-repeat scroll 0 0 transparent';
	el_lor_icon.style.backgroundSize = '20px 20px';
	el_lor_content.textContent = 'Repeat '
	el_action_bar.insertBefore(el_lor_span, el_share_span.nextSibling);
	
	return 1;
	//theDoc.documentElement.addEventListener('transitionend', ytMsgReceived, false);
}

function ytPopRecd(e) {
	console.log('y pop received, e:', e);
}

function ytMsgReceived(e) {
	console.log('yt transitionend received', 'e:', e);
	if (e.propertyName === 'width' && e.target.id === 'progress') {
		console.info('afterNavigate ready', 'e:', e);
		addDiv(e.target.ownerDocument);
	}
}

function removeDiv(theDoc, skipChecks) {
	//console.log('removeDiv');
	if (!skipChecks) {
		if (!theDoc) { console.log('no doc!'); return; } //document not provided, it is undefined likely
		if(!(theDoc.location && theDoc.location.host.indexOf(hostPattern) > -1)) { console.log('location not match host:' + theDoc.location.host); return; }
		//if (!theDoc instanceof Ci.nsIDOMHTMLDocument) { console.log('not html doc'); return; } //not html document, so its likely an xul document //you probably dont need this check, checking host is enought
	}
	
	var myDiv = theDoc.getElementById(self.id + '.repeat'); //test if myDiv is in the page
	if (myDiv) {
		var alreadyThere = true;
	}
	if (alreadyThere) {
		//my stuff was found in the document so remove it
		myDiv.parentNode.removeChild(myDiv);
		//theDoc.documentElement.removeEventListener('transitionend', ytMsgReceived, false);
	} else {
		//else its not there so no need to do anything
	}
}

var progListener = {
/*
    onStateChange: function(aProgress, aRequest, aFlags, aStatus) {
        var arrAFlags = [];
        if (aFlags) {
            for (var f in Ci.nsIWebProgressListener) {
                if (aFlags & Ci.nsIWebProgressListener[f]) {
                    arrAFlags.push(f);
                }
            }
        }
        //console.log('onStateChange', {aProgress: aProgress, aRequest: aRequest, aFlags:arrAFlags, aStatus: aStatus});
		if (aFlags & Ci.nsIWebProgressListener.STATE_STOP) {
			if (aRequest && aRequest.name.indexOf('youtube.com') > -1) {
				var contentWindow = aProgress.DOMWindow.top;
				console.log('contentWindow:', contentWindow);
				if (contentWindow.frameElement) {
					//its a frame
					console.log('its a frame');
					if (ignoreFrames) {
						return;//dont want to watch frames
					}
				}
				var t = 0; //try
				var maxTry = 1;
				var tryAddIt = function() {
					contentWindow.setTimeout(function() {
						var ret = addDiv(contentWindow.document);
						if (ret) {
							console.log('found and inserted');
						} else {
							t++;
							if (t < maxTry) {
								console.log('not found yet will wait and try again');
								tryAddIt();
							} else {
								console.log('maxTry reached so determined this page does not have it');
								console.info(contentWindow.location.href, contentWindow.document.documentElement.innerHTML);
							}
						}
					}, 100);
				}
				tryAddIt();
			}
		}
    }
    */
    onLocationChange: function (aProgress, aRequest, aURI, aFlags) {
        var notes = {};
    	try {
    		notes['aProgress.currentDocumentChannel.name'] = aProgress.currentDocumentChannel.name;
    	} catch(ignore) {}
    	try {
    		notes['aRequest.name'] = aRequest.name;
    	} catch(ignore) {}
    	try {
    		notes['aURI.spec'] = aURI.spec;
    	} catch(ignore) {}
    	try {
    		notes.chromeEventHandler = aProgress.chromeEventHandler;
    	} catch(ignore) {}
    	try {
    		notes.DOMWin = aProgress.DOMWindow;
    	} catch(ignore) {}
    	try {
    		notes.pBar = aProgress.DOMWindow.document.getElementById('progress');
    	} catch(ignore) {}
    	try {
    		notes.pBarTop = aProgress.DOMWindow.top.document.getElementById('progress');
    	} catch(ignore) {}
    	try {
    		notes.pBarChrome = aProgress.chromeEventHandler.contentDocument.getElementById('progress');
    	} catch(ignore) {}
    	try {
    		notes.chromeEventHandler.ownerDocument.defaultView.setTimeout(function() {
    			console.log({html:aProgress.chromeEventHandler.contentDocument.body.innerHTML})
    		}, 50)
    	} catch(ignore) {}
    	
    	if (aRequest && aRequest.name.indexOf('youtube.com') > -1) {
    		
    	} else {
    		//return;
    	}
        var arrAFlags = [];
        if (aFlags) {
            for (var f in Ci.nsIWebProgressListener) {
                if (aFlags & Ci.nsIWebProgressListener[f]) {
                    arrAFlags.push(f);
                }
            }
        }
        if (!aRequest && aFlags == 0) {
            notes.switch = 'just tab switch';
            //console.warn('just a tab switch so aborting');
            //return;
        }
        if (aFlags & Ci.nsIWebProgressListener.LOCATION_CHANGE_SAME_DOCUMENT) {
            notes.anchor = 'anchor clicked!';
        }
        var domWin = aProgress.DOMWindow;
        var domDoc = domWin.document;
        if(!domDoc) {
            notes.docWarn = 'document not loaded yet';
        }
	console.log('onLocationChange', {aProgress: aProgress, aRequest: aRequest, aURI:aURI, aFlags:arrAFlags, notes:notes});
	/*
        if (domDoc) {
	        if (aURI && /youtube\.com/i.test(aURI.spec)) {
	        	var contentWindow = aProgress.DOMWindow
	        	//check for progress bar
	        	var pBar = contentWindow.document.getElementById('progress');
	        	if (pBar) {
	        		notes.push({'pBar is there':pBar});
	        	}
			var t = 0; //try
			var maxTry = 10;
			var tryAddIt = function() {
				contentWindow.setTimeout(function() {
					var ret = addDiv(contentWindow.document);
					if (ret === 1) {
						console.log('found and inserted');
					} else {
						//returns 0 or false if not inserted
						if (ret === -1) {
							console.warn('not incrmenting t as ret === -1');
						} else {
							t++;
						}
						if (t < maxTry) {
							console.log('not found yet will wait and try again');
							tryAddIt();
						} else {
							console.log('maxTry reached so determined this page does not have it');
							console.info(contentWindow.location.href, contentWindow.document.documentElement.innerHTML);
						}
					}
				}, 100);
			}
			tryAddIt();
	        }
        }
        */
    }
}

function listenPageLoad(event) {
	var win = event.originalTarget.defaultView;
	var doc = win.document;
	console.log('page loaded loc = ' + doc.location);
	if (win.frameElement) {
		//its a frame
		console.log('its a frame');
		if (ignoreFrames) {
			return;//dont want to watch frames
		}
	}
	addDiv(doc);
}

/*start - windowlistener*/
var windowListener = {
	//DO NOT EDIT HERE
	onOpenWindow: function (aXULWindow) {
		// Wait for the window to finish loading
		let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		aDOMWindow.addEventListener("load", function () {
			aDOMWindow.removeEventListener("load", arguments.callee, false);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}, false);
	},
	onCloseWindow: function (aXULWindow) {},
	onWindowTitleChange: function (aXULWindow, aNewTitle) {},
	register: function () {
		// Load into any existing windows
		let XULWindows = Services.wm.getXULWindowEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			windowListener.loadIntoWindow(aDOMWindow, aXULWindow);
		}
		// Listen to new windows
		Services.wm.addListener(windowListener);
	},
	unregister: function () {
		// Unload from any existing windows
		let XULWindows = Services.wm.getXULWindowEnumerator(null);
		while (XULWindows.hasMoreElements()) {
			let aXULWindow = XULWindows.getNext();
			let aDOMWindow = aXULWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
			windowListener.unloadFromWindow(aDOMWindow, aXULWindow);
		}
		//Stop listening so future added windows dont get this attached
		Services.wm.removeListener(windowListener);
	},
	//END - DO NOT EDIT HERE
	loadIntoWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		if (aDOMWindow.gBrowser) {
			aDOMWindow.gBrowser.addProgressListener(progListener);
			if (aDOMWindow.gBrowser.tabContainer) {
				//has tabContainer
				//start - go through all tabs in this window we just added to
				var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
				for (var i = 0; i < tabs.length; i++) {
					console.log('DOING tab: ' + i);
					var tabBrowser = tabs[i].linkedBrowser;
					var win = tabBrowser.contentWindow;
					loadIntoContentWindowAndItsFrames(win);
				}
				//end - go through all tabs in this window we just added to
			} else {
				//does not have tabContainer
				var win = aDOMWindow.gBrowser.contentWindow;
				loadIntoContentWindowAndItsFrames(win);
			}
		} else {
			//window does not have gBrowser
		}
	},
	unloadFromWindow: function (aDOMWindow, aXULWindow) {
		if (!aDOMWindow) {
			return;
		}
		if (aDOMWindow.gBrowser) {
			aDOMWindow.gBrowser.removeProgressListener(progListener);
			if (aDOMWindow.gBrowser.tabContainer) {
				//has tabContainer
				//start - go through all tabs in this window we just added to
				var tabs = aDOMWindow.gBrowser.tabContainer.childNodes;
				for (var i = 0; i < tabs.length; i++) {
					console.log('DOING tab: ' + i);
					var tabBrowser = tabs[i].linkedBrowser;
					var win = tabBrowser.contentWindow;
					unloadFromContentWindowAndItsFrames(win);
				}
				//end - go through all tabs in this window we just added to
			} else {
				//does not have tabContainer
				var win = aDOMWindow.gBrowser.contentWindow;
				unloadFromContentWindowAndItsFrames(win);
			}
		} else {
			//window does not have gBrowser
		}
	}
};
/*end - windowlistener*/

function loadIntoContentWindowAndItsFrames(theWin) {
	var frames = theWin.frames;
	var winArr = [theWin];
	for (var j = 0; j < frames.length; j++) {
		winArr.push(frames[j].window);
	}
	console.log('# of frames in tab: ' + frames.length);
	for (var j = 0; j < winArr.length; j++) {
		if (j == 0) {
			console.log('**checking win: ' + j + ' location = ' + winArr[j].document.location);
		} else {
			console.log('**checking frame win: ' + j + ' location = ' + winArr[j].document.location);
		}
		var doc = winArr[j].document;
		//START - edit below here
		addDiv(doc);
		if (ignoreFrames) {
			break;
		}
		//END - edit above here
	}
}

function unloadFromContentWindowAndItsFrames(theWin) {
	var frames = theWin.frames;
	var winArr = [theWin];
	for (var j = 0; j < frames.length; j++) {
		winArr.push(frames[j].window);
	}
	console.log('# of frames in tab: ' + frames.length);
	for (var j = 0; j < winArr.length; j++) {
		if (j == 0) {
			console.log('**checking win: ' + j + ' location = ' + winArr[j].document.location);
		} else {
			console.log('**checking frame win: ' + j + ' location = ' + winArr[j].document.location);
		}
		var doc = winArr[j].document;
		//START - edit below here
		removeDiv(doc);
		if (ignoreFrames) {
			break;
		}
		//END - edit above here
	}
}

function startup(aData, aReason) {
	windowListener.register();
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;
	windowListener.unregister();
}

function install() {}

function uninstall() {}
