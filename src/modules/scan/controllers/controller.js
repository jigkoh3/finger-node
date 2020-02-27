'use strict';
var mongoose = require('mongoose'),
    model = require('../models/model'),
    mq = require('../../core/controllers/rabbitmq'),
    Scan = mongoose.model('Scan'),
    Student = mongoose.model('Student'),
    Classroom = mongoose.model('Classroom'),
    errorHandler = require('../../core/controllers/errors.server.controller'),
    _ = require('lodash');

exports.getList = function (req, res) {
    var pageNo = parseInt(req.query.pageNo);
    var size = parseInt(req.query.size);
    var query = {};
    if (pageNo < 0 || pageNo === 0) {
        response = { "error": true, "message": "invalid page number, should start with 1" };
        return res.json(response);
    }
    query.skip = size * (pageNo - 1);
    query.limit = size;
    Scan.find({}, {}, query, function (err, datas) {
        if (err) {
            return res.status(400).send({
                status: 400,
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp({
                status: 200,
                data: datas
            });
        };
    });
};

exports.create = function (req, res) {
    var newScan = new Scan(req.body);
    // console.log(newScan);
    newScan.createby = req.user;
    newScan.save(function (err, data) {
        if (err) {
            return res.status(400).send({
                status: 400,
                message: errorHandler.getErrorMessage(err)
            });
        } else { 
            res.jsonp({
                status: 200,
                data: data,
            });
            /**
             * Message Queue
             */
            // mq.publish('exchange', 'keymsg', JSON.stringify(newOrder));
        };
    });
};

exports.getByID = function (req, res, next, id) {

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).send({
            status: 400,
            message: 'Id is invalid'
        });
    }

    Scan.findById(id, function (err, data) {
        if (err) {
            return res.status(400).send({
                status: 400,
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            req.data = data ? data : {};
            next();
        };
    });
};

exports.read = function (req, res) {
    res.jsonp({
        status: 200,
        data: req.data ? req.data : []
    });
};

exports.update = function (req, res) {
    var updScan = _.extend(req.data, req.body);
    updScan.updated = new Date();
    updScan.updateby = req.user;
    updScan.save(function (err, data) {
        if (err) {
            return res.status(400).send({
                status: 400,
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp({
                status: 200,
                data: data
            });
        };
    });
};

exports.delete = function (req, res) {
    req.data.remove(function (err, data) {
        if (err) {
            return res.status(400).send({
                status: 400,
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            res.jsonp({
                status: 200,
                data: data
            });
        };
    });
};

exports.getExistStudent = function (req, res, next) {
    // console.log("getExistStudent")
    Student.findOne({ $or: [{ finger_id1: req.body.finger_id }, { finger_id2: req.body.finger_id }] }, function (err, data) {
        if (err) {
            return res.status(400).send({
                status: 400,
                message: errorHandler.getErrorMessage(err)
            });
        } else {
            if (data) { 
                req.student = data;
                next();
            } else {
                return res.status(400).send({
                    status: 400,
                    message: "Student not found!!"
                })
            }
        }
    })
}

exports.getClassByTime = function (req, res, next) {
    var hour = (new Date(new Date().getTime() - (24 * 60 * 60 * 1000)).getHours());
    var min = (new Date(new Date().getTime() - (24 * 60 * 60 * 1000)).getMinutes());

    var date = new Date();
    var DayOfWeek = date.getDay();

    var day = date.getDate(); //days from month 1-31
    var month = date.getUTCMonth() + 1; //months from 1-12
    var year = date.getUTCFullYear(); //year
    var dateNow = day + "/" + month + "/" + year;
    var timeNow = parseFloat(hour.toString() + "." + min.toString());
    console.log(timeNow);
    if (DayOfWeek == 1) {
        DayOfWeek = "จันทร์"
    } else if (DayOfWeek == 2) {
        DayOfWeek = "อังคาร"
    } else if (DayOfWeek == 3) {
        DayOfWeek = "พุธ"
    } else if (DayOfWeek == 4) {
        DayOfWeek = "พฤหัสบดี"
    } else {
        DayOfWeek = "ศุกร์"
    }
    Classroom.findOne({ group_name: req.student.group_name }, function (err, data) {
        if (err) {
            return res.status(400).send({
                status: 400,
                message: errorHandler.getErrorMessage
            })
        } else {
            if (data) {
                var timebeforstart = (parseFloat(data.timestart) - 1).toFixed(2);
                var timeend = parseFloat(data.timeend);
                if (timeNow >= timebeforstart && timeNow <= timeend && data.DayOfWeek === DayOfWeek) {
                    var ScanNew = {
                        finger_id: req.body.finger_id,
                        time: timeNow,
                        date: dateNow
                    }
                    console.log(ScanNew);
                    req.body = ScanNew;
                    req.classroom = data;
                    next();
                } else {
                    return res.status(400).send({
                        status: 400,
                        message: "Time not found"
                    })
                }
            } else {
                return res.status(400).send({
                    status: 400,
                    message: "Classroom not found"
                })
            }
        }
    })
}

// exports.updateReport = function (req, res) {
//     console.log("Update !!");
// }
