/***************************************************************************
   Copyright 2015 OSIsoft, LLC.

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
 ***************************************************************************/

var basePIWebAPIUrl = "https://YourPIWebAPIServer/piwebapi";
var basePIWebAPIChannelUrl = "wss://YourPIWebAPIServer/piwebapi";
var piDataArchiveName = "YourPIDataArchive";

// PI Web API wrapper module
var piwebapi = (function () {
    var currentUserName = null;
    var currentPassword = null;
    var webSocket = null;

    // Send ajax request
    var processJsonContent = function (url, type, data, successCallBack, errorCallBack) {
        return $.ajax({
            url: encodeURI(url),
            type: type,
            data: data,
            contentType: "application/json; charset=UTF-8",
            beforeSend: function (xhr) {
                xhr.setRequestHeader("Authorization", makeBasicAuth(currentUserName, currentPassword));
            },
            success: successCallBack,
            error: errorCallBack
        });
    };

    // Return authorization header value for basic authentication
    var makeBasicAuth = function (user, password) {
        var tok = user + ':' + password;
        var hash = window.btoa(tok);
        return "Basic " + hash;
    };

    // Batch demonstration: get list of tags based on particular PI Data Archive and tag mask
    var getTagListRequest = function (piDataArchive, tagMask, successCallBack, errorCallBack) {
        var url = basePIWebAPIUrl + "/batch";
        var data = {};
        data["1"] = {
            "Method": "GET",
            "Resource": encodeURI(basePIWebAPIUrl + "/dataservers?name=" + piDataArchive)
        };
        data["2"] = {
            "Method": "GET",
            "Resource": "{0}?nameFilter=" + encodeURIComponent(tagMask),
            "Parameters": [
              "$.1.Content.Links.Points"
            ],
            "ParentIds": [
              "1"
            ]
        }
        return processJsonContent(url, "POST", JSON.stringify(data), successCallBack, errorCallBack);
    };

    // Normal HTTP request: get plot values based on webId
    var getValuesRequest = function (tagWebId, startTime, pixels, successCallBack, errorCallBack) {
        var url = basePIWebAPIUrl + "/streams/" + tagWebId + "/plot?intervals=" + pixels;
        if (startTime != null) {
            url += "&starttime=" + startTime;
        }
        return processJsonContent(url, "GET", null, successCallBack, errorCallBack);
    };

    // Channels demonstration: open web socket based on webId
    var openStreamChannel = function (tagWebId, channelOpenCallBack, channelErrorCallBack, channelMessageCallBack, channelCloseCallBack) {
        var url = basePIWebAPIChannelUrl + "/streams/" + tagWebId + "/channel";
        webSocket = new WebSocket(encodeURI(url));
        webSocket.onopen = channelOpenCallBack;
        webSocket.onerror = channelErrorCallBack;
        webSocket.onmessage = channelMessageCallBack;
        webSocket.onclose = channelCloseCallBack;
    };

    // Channels demonstration: close web socket
    var closeStreamChannel = function () {
        if (webSocket != null) {
            webSocket.close();
        }
    };

    // Publicly available methods
    return {
        // Store current username and password
        SetCredentials: function (user, password) {
            currentUserName = user;
            currentPassword = password;
        },

        // Test basic authentication
        Authorize: function (successCallBack, errorCallBack) {
            return processJsonContent(basePIWebAPIUrl, 'GET', null, successCallBack, errorCallBack);
        },

        // Reset username/password and web socket
        Reset: function () {
            currentUserName = null;
            currentPassword = null;
            webSocket.close();
            webSocket = null;
        },

        // Get the list of tags based on tagmask
        GetTagList: function (tagMask, processFunction, errorFunction, errorCallBack) {
            var successCallBack = function (data) {
                var filteredTags = {};
                if (data["1"].Status == 200 && data["2"].Status == 200) {
                    for (var i = 0; i < data["2"].Content.Items.length; i++) {
                        filteredTags[data["2"].Content.Items[i].Name] = data["2"].Content.Items[i].WebId;
                    }
                    processFunction(filteredTags);
                }
                else {
                    errorFunction();
                }
            };
            getTagListRequest(piDataArchiveName, tagMask, successCallBack, errorCallBack);
        },

        // Get plot values based on webId
        GetValues: function (tagWebId, startTime, pixels, successCallBack, errorCallBack) {
            getValuesRequest(tagWebId, startTime, pixels, successCallBack, errorCallBack);
        },

         // Open channel for a stream
        OpenChannel: function (tagWebId, channelOpenCallBack, channelErrorCallBack, channelMessageCallBack, channelCloseCallBack) {
            openStreamChannel(tagWebId, channelOpenCallBack, channelErrorCallBack, channelMessageCallBack, channelCloseCallBack);
        },

        // Close existing opened channel
        CloseChannel: function () {
            closeStreamChannel();
        }
    }
})();