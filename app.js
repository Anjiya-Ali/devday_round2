const express = require("express");
const session = require('express-session');
var mysql = require('mysql');
const app = express();
const fs = require('fs');
var nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const secret = crypto.randomBytes(32).toString('hex');

app.use(bodyParser.urlencoded({ extended: true }));

var con = mysql.createConnection({
    host: "127.0.0.1",
    user: "root",
    password: "",
    database: 'classroom'
  });
  
con.connect(function(err){
    if (err) throw err;
    console.log("Connected!");
});

app.set("view engine", "pug");

app.use(express.static(__dirname + '/frontend/public'));

app.use(session({
    secret: secret,
    resave: false,
    saveUninitialized: false,
}));

function generateUniqueRandomNumber() {
    const randomBytes = crypto.randomBytes(3);
    const randomNumber = parseInt(randomBytes.toString('hex'), 16) % 100000;
    const filePath = './used-random-numbers.txt';
  
    let usedNumbers = [];
    if (fs.existsSync(filePath)) {
      usedNumbers = fs.readFileSync(filePath, 'utf8').split(',');
    }
  
    while (usedNumbers.includes(randomNumber.toString())) {
      const randomBytes = crypto.randomBytes(3);
      const randomNumber = parseInt(randomBytes.toString('hex'), 16) % 100000;
    }
  
    usedNumbers.push(randomNumber.toString());
    fs.writeFileSync(filePath, usedNumbers.join(','));
  
    return randomNumber.toString().padStart(5, '0');
}

app.post('/login', (req, res) => {
    var emaill=req.body.email;
    var passwordd=req.body.password;
    
    var sql= `SELECT * from student where email = '${emaill}' AND password = '${passwordd}'`;

    con.query(sql, function (err, result, fields){
        if (result.length<=0){
            var sql1= `SELECT * from teacher where email = '${emaill}' AND password = '${passwordd}'`;
            con.query(sql1, function (err, result1, fields){
                if (result1.length<=0){
                    // var sql1= `SELECT * from teacher where email = '${emaill}' AND password = '${passwordd}'`;
                    res.status(200).render('index1.pug',{message1: '* Email/Password is invalid'});
                }
                else{
                    req.session.userId = result1[0].tc_id;
                    req.session.role = "teacher";
                    res.redirect('/');
                }
            });
        }
        else{
            req.session.userId = result[0].std_id;
            req.session.role = "student";
            res.redirect('/');
        }
    });
    // req.session.userId = 1;
    // res.redirect('/');
});

app.post('/signup', (req, res) => {
    var emaill=req.body.email;
    var passwordd=req.body.password;
    if(passwordd.length===0 || emaill.length===0)
    {
        res.status(200).render('create.pug',{message1: '*Please provide all fields'});
    }
    else{
        var sql= `SELECT * from student where email = '${emaill}'`;
        con.query(sql, function (err, result, fields){
            if(result.length>0)
            {
                res.status(200).render('create.pug',{message1:'*Email already exists'});
            }
            else{
                var sql= `Insert into student(Email,Password) values('${emaill}','${passwordd}')`;
                con.query(sql, function (err, result, fields){
                    console.log("student data has been inserted");
                    res.status(200).render('index1.pug',{message1: '*Account has been created please login'});
                });
            }
        });   
    }
});

app.post('/create_class', (req, res) => {
    var namee=req.body.name;
    var section=req.body.section;
    var subject=req.body.subject;
    var room=req.body.room;
    var idd = req.session.userId;
    var code = generateUniqueRandomNumber()
    var sql= `Insert into class(name,section,subject,code,room) values('${namee}','${section}','${subject}','${code}','${room}')`;
    con.query(sql, function (err, result, fields){
        console.log("class data has been inserted");
        var sql4= `SELECT * from class where code = '${code}'`;
        con.query(sql4, function (err, result4, fields){
            console.log("teacherclass data has been inserted");
            var sql3= `Insert into teacherclass(class_id,tc_id) values('${result4[0].class_id}','${idd}')`;
            con.query(sql3, function (err, result3, fields){
                console.log("teacherclass data has been inserted");
            });
        });
        res.redirect('/');
        // res.status(200).render('index1.pug',{message1:'',message2: '*Account has been created please login'});
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

app.get('/create', (req, res) => {
    res.render('create');
});

app.get("/", function (req, res) {
    var idd = req.session.userId
    if (req.session.userId) {
        if(req.session.role == "teacher"){
            var sql= `SELECT * from teacherclass where tc_id = '${idd}'`;

            con.query(sql, function (err, result, fields){
                if (result.length<=0){
                    res.status(200).render('teacher_home.pug',{});
                }
                else{    
                    var sql2= `SELECT * from teacherclass join class on teacherclass.class_id = class.class_id where tc_id = '${idd}'`;

                    con.query(sql2, function (err, result2, fields){
                        const results = {
                            id: result2[0].class_id,
                            name: result2[0].name,
                            section: result2[0].section
                        };   
                        res.status(200).render('teacher_classes.pug',{classes: results});
                    });
                }
            });
        }
        else{

        }
    } else {
        res.sendFile(__dirname + "/frontend/index.html");
    }
});

app.get('/classes/:id', (req, res) => {
    var class_idd = req.params.id;
    var sql= `SELECT * from class where class_id = '${class_idd}'`;
    con.query(sql, function (err, result, fields){
        const results = {
            id: result[0].class_id,
            name: result[0].name,
            code: result[0].code
        };   
        res.status(200).render('singleclass.pug',{classes: results});
    });
});

app.get('/classes/:id/classwork', (req, res) => {
    var class_idd = req.params.id;
    var sql= `SELECT * from classtask join task on classtask.task_id = task.task_id join class on class.class_id = classtask.class_id where classtask.class_id = '${class_idd}'`;
    con.query(sql, function (err, result, fields){
        const results = {
            name: result[0].name,
            class_id: result[0].class_id,
            title: result[0].title,
            instructions: result[0].instructions,
            duedate: result[0].duedate
        };   
        res.status(200).render('classwork.pug',{classes: results});
    });
});

app.post('/classes/:id/create_assignment', (req, res) => {
    var idd = req.params.id;
    var title=req.body.title;
    var points=req.body.points;
    var instructions=req.body.instructions;
    var date=req.body.date;
    var sql= `Insert into task(title,instructions,points,duedate) values('${title}','${instructions}','${points}','${date}')`;
    con.query(sql, function (err, result, fields){
        console.log("class data has been inserted");
        var sql4= `SELECT * from task where title = '${title}' AND instructions = '${instructions}'`;
        con.query(sql4, function (err, result4, fields){
            console.log("teacherclass data has been inserted");
            var sql3= `Insert into classtask(class_id,task_id) values('${idd}', '${result4[0].task_id}')`;
            con.query(sql3, function (err, result3, fields){
                console.log("teacherclass data has been inserted");
            });
        });
        res.redirect('/');
        // res.status(200).render('index1.pug',{message1:'',message2: '*Account has been created please login'});
    });
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.listen(2000, function () {
    console.log("Server is running on localhost3000");
});