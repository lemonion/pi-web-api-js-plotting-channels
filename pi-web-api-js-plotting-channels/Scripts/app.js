var piTagWebIds = {};
var plotData = [[]];
var width = "800";

// General error call back
var errorCallBack = function (xhr) {
    console.log(xhr.responseText);
}

// Flot plot options
var options = {
    xaxis: {
        mode: "time",
        timeformat: "%Y/%m/%d %H:%M:%S",
        timezone: "browser"
    }
};

// Reset buttons, text boxes and plot in the plot view
var resetPlotView = function () {
    $('#tagmask-text').val('');
    $('#tag-select').empty();
    $('#time-interval-text').val('');
    $('#plot-btn').attr('disabled', 'disabled');
    $('#stop-btn').attr('disabled', 'disabled');
    $('#plot').empty();
};

// Get the plot start time based on current time and plot time interval
var getPlotStartTime = function (intervalUnit, intervalVal) {
    var ret = new Date();
    switch (intervalUnit.toLowerCase()) {
        case 'h': ret.setTime(ret.getTime() - intervalVal * 3600000); break;
        case 'm': ret.setTime(ret.getTime() - intervalVal * 60000); break;
        case 's': ret.setTime(ret.getTime() - intervalVal * 1000); break;
        default: ret = undefined; break;
    }
    return ret;
};

// Test username/password and go to plot screen
$('#go-to-plot-btn').click(function () {
    // Store username and password
    var username = $("#username").val();
    var password = $("#password").val();
    piwebapi.SetCredentials(username, password);

    // Check authentication
    var authSuccessCallBack = function (data, statusMessage, statusObj) {
        if (statusObj.status == 200) {
            $('#auth-view-mode').hide();
            $('#plot-view-mode').show();
        }
    };
    var authErrorCallBack = function (data) {
        if (data.status == 401) {
            alert("Invalid username and password.");
        }
        else {
            alert("Error during validation.");
        }
    };
    piwebapi.Authorize(authSuccessCallBack, authErrorCallBack);
});

// Go back to login screen
$("#back-btn").click(function () {
    $("#username").val('');
    $("#password").val('');

    $("#plot-view-mode").hide();
    $("#auth-view-mode").show();

    piwebapi.Reset();
    resetPlotView();
});

// Search for tags using tag mask
$('#search-btn').click(function (data) {
    $('#plot-btn').attr('disabled', 'disabled');
    $('#tag-select').empty();
    var tagMask = $('#tagmask-text').val();
    if (tagMask.length > 0) {
        var populateTags = function (tags) {
            $.each(tags, function (name, webId) {
                $('#tag-select').append("<option value=\"" + name + "\">" + name + "</option>");
            });
            piTagWebIds = tags;
            $('#plot-btn').removeAttr('disabled');
        };
        var error = function () {
            alert("Error during tag search.");
        };
        piwebapi.GetTagList(tagMask, populateTags, error, errorCallBack);
    }
});

// Start plot
$('#plot-btn').click(function (data) {
    var tag = $('#tag-select option:selected').text();
    var timeInterval = $('#time-interval-text').val();
    var timeIntervalUnit = $('#time-interval-unit option:selected').val();

    if (tag.length > 0) {
        // Get initial values
        if (timeInterval.length <= 0 || isNaN(timeInterval)) {
            timeInterval = 1;
            $('#time-interval-text').val(timeInterval);
        }
        var startTime = "*-" + timeInterval + timeIntervalUnit;

        var successCallBack = function (values) {
            plotData = [[]];
            for (var i = 0; i < values.Items.length; i++) {
                if (values.Items[i].Good) {
                    plotData[0].push([new Date(values.Items[i].Timestamp).getTime(), values.Items[i].Value]);
                }
            }
            $.plot($('#plot'), plotData, options);
        };

        piwebapi.GetValues(piTagWebIds[tag], startTime, width, successCallBack, errorCallBack)

        // Open channel
        var messageCallBack = function (event) {
            var values = JSON.parse(event.data);
            var plotStartTime = getPlotStartTime(timeIntervalUnit, timeInterval);

            // Remove old values before new start time
            var removeCount = 0;
            while (plotData[0][removeCount][0] < plotStartTime.getTime()) {
                removeCount++;
            }
            plotData[0].splice(0, removeCount);

            // Add new values
            for (var i = 0; i < values.Items[0].Items.length; i++) {
                if (values.Items[0].Items[i].Good) {
                    var timestamp = new Date(values.Items[0].Items[i].Timestamp);
                    if (timestamp.getTime() >= plotStartTime.getTime()) {
                        plotData[0].push([timestamp.getTime(), values.Items[0].Items[i].Value]);
                    }
                }
            }

            // Sort array
            plotData[0].sort(function (a, b) {
                if (a[0] === b[0]) {
                    return 0;
                }
                else {
                    return (a[0] < b[0]) ? -1 : 1;
                }
            });

            // Plot
            $.plot($('#plot'), plotData, options);
        };

        var errorCallBack = function () {
            alert("Error getting updates.");
        };

        var openCallBack = function () {
            $('#search-btn').attr('disabled', 'disabled');
        };

        var closeCallBack = function () {
            $('#search-btn').removeAttr('disabled');
        };

        piwebapi.OpenChannel(piTagWebIds[tag], openCallBack, errorCallBack, messageCallBack, closeCallBack);

        $('#plot-btn').attr('disabled', 'disabled');
        $('#stop-btn').removeAttr('disabled');
    }
});

// Stop update
$('#stop-btn').click(function (data) {
    piwebapi.CloseChannel();
    $('#plot-btn').removeAttr('disabled');
    $('#stop-btn').attr('disabled', 'disabled');
});