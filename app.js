//========================================================================
// node moduals that is require
var express = require("express"),
    bodyParser = require("body-parser"),
    mongo = require("mongoose"),
    fileUpload = require('express-fileupload'),
    methodOverride = require("method-override"),
    passport = require("passport"),
    localStrategy = require("passport-local"),
    passportLocalMongoose = require("passport-local-mongoose"),
    nodemailer = require('nodemailer'),
    flash = require("connect-flash"),
    session = require('express-session'),
    cookieParser = require('cookie-parser');

//=========================================================================

//Database SetUp
mongo.connect(process.env.DB, {
    useMongoClient: true
});
//Product Schema 
var solarItems = new mongo.Schema({
    title: String,
    category: String,
    company: String,
    description: String,
    img: String,
    prize: Number,
    warranty: String,
    stock : Number,
    created: {
        type: Date,
        default: Date.now
    }
})
var solarProduct = mongo.model("solarProduct", solarItems);

//Authetication Schema 
var userSchema = new mongo.Schema({
    username: String,
    password: String,
    name: String,
    lname : String,
    mobile : Number,
    address : String,
    gender : String,
    dob : Date,
    img: {
        type: String,
        default: "../images/img_avatar.png"
    },
    isAdmin : Boolean, //this can be done other way by storing user id to product who creates (which is always admin)                  
    transactions: [{    //   and compare id of current user and creater user 
        type : mongo.Schema.Types.ObjectId, // or can be saperate mechanism dashboard type
        ref : "transaction"
    }],
    created: {
        type: Date,
        default: Date.now
    }
});
userSchema.plugin(passportLocalMongoose);
var user = mongo.model("user", userSchema);

//Transaction Schema 
var transactionSchema = new mongo.Schema({
    productId: {
        type: mongo.Schema.Types.ObjectId,
        ref: "solarProduct"
    },
    userId : {
        type: mongo.Schema.Types.ObjectId,
        ref: "user"
    },
    quantity : Number,
    prize : Number,
    status : String,
    created:{
        type: Date,
        default: Date.now
    }
});
var transaction = mongo.model("transaction",transactionSchema);


//=========================================================================
//other Settings
var app = express();
app.set("view engine", "ejs");
app.use(fileUpload());
app.use(express.static("public"));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(methodOverride("_method"));
app.use(require("express-session")({
    secret: "yogen drumil project",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieParser('secret'));
app.use(session({cookie: { maxAge: 60000 }}));
app.use(flash());
passport.use(new localStrategy(user.authenticate()));
passport.serializeUser(user.serializeUser());
passport.deserializeUser(user.deserializeUser());

function fileUp(reqBody, reqFiles) {
    if (!reqFiles)
        return console.log("No files were uploaded.");
    else
        console.log(reqFiles);
 
    reqBody.img = "../images/" + reqFiles.img.name;
    console.log(reqBody);

    //setting for server path where uploded file saved
    path =  "./public/images/" + reqFiles.img.name;
    imgfile = reqFiles.img;
    imgfile.mv(path, function (err) {
        if (err)
            console.log("Error while Upload");
        else
            console.log("Successfully uploaded.");
    });

}
//mail settings
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GU,
        pass: process.env.GP
    }
});

//=========================================================================
//listener
app.listen(process.env.PORT,process.env.IP, function () {
    console.log("Server started at 3000...")
});

//=========================================================================

// middleware
function isLoggedAdmin(req, res, next) {
    if (req.isAuthenticated()) {
        if(req.user.isAdmin)
            return next();
    }
    res.redirect("/");
}
function isLoggedUser(req, res, next) {
    if (req.isAuthenticated()) {
            return next();
    }
    res.redirect("/");
}

app.use(function (req, res, next) { ///executes on every single routes
    res.locals.currentUser = req.user; //for giving logged user info
    next(); // here req."user" not same as user.....
});

//=========================================================================
//Routes 
app.get("/", function (req, res) { //home page
    res.render("home");
})

app.post("/", function (req, res) { // for registration
    var newUser = new user({
        username: req.body.username,
        name: req.body.name,
        lname: req.body.lname,
        mobile: req.body.mobile,
        address: req.body.address,
        gender: req.body.gender,
        dob: req.body.dob,
        isAdmin: false,
        img: "../images/"+ req.files.img.name,
    });
    user.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log("Error while register : " + err);
            return res.render("/");
        }
        fileUp(req.body,req.files);
        //sending mail : signup
        passport.authenticate("local")(req, res, function () {
            var signUpNotification = {
                from: process.env.GU,
                to: req.user.username,
                subject: 'SignUp on Solar Store',
                text: 'You are Successfully registered in Solar Store '
            };
            transporter.sendMail(signUpNotification, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
            res.redirect("/");
        })
    });
})

app.post('/login', function (req, res, next) { //login route is dummy
    passport.authenticate('local', function (err, user, info) {
        if (err) {
            return next(err);
        }
        if (!user) {
            console.log("not User");
            req.flash("error", "Not Regestered User")
            return res.redirect('/');
        }
        req.logIn(user, function (err) {
            if (err) {
                return next(err);
            }
            // sending mail : login
            console.log("Login..");
            var loginNotification = {
                from:process.env.GU,
                to: req.user.username,
                subject: 'Sending Email using Node.js',
                text: 'Login kiya he tune bhagat'
            };
            transporter.sendMail(loginNotification, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
            console.log(info);
            return res.redirect("/products");
        });
    })(req, res, next);
});

app.get("/logout", function (req, res) { //logout 
    req.logout();
    res.redirect("/");
})

app.get("/products", function (req, res) { // Product Page
    console.log(req.user);
    solarProduct.find({}, function (err, solarProduct) {
        if (err) {
            console.log("Error...!");
        } else {
            res.render("products", {solarProduct: solarProduct});
        }
    });
})

app.get("/products/:id", function (req, res) { //show product details
    solarProduct.findById(req.params.id, function (err, solarProduct) {
        if (err) {
            res.redirect("/products");
        } else {
            res.render("show", {
                solarProduct: solarProduct
            });
        }
    })
})

app.post("/products", isLoggedAdmin, function (req, res) { //adding new item to db
    //uploading file
    fileUp(req.body, req.files);
    //database entry for new Product
    solarProduct.create(req.body, function (err, solarProduct) {
        if (err) {
            res.render("/products");
        } else {
            console.log(solarProduct);
            res.redirect("/products");
        }
    })
})
app.put("/products/:id", isLoggedAdmin, function (req, res) { //edit product 
    console.log(req.body);
    solarProduct.findByIdAndUpdate(req.params.id, req.body, function (err, solarProduct) { //two veriants are there check this 
        if (err) {
            console.log("Error while Update.");
            res.redirect("/products");
        } else
            res.redirect("/products/" + req.params.id);
    });
})

app.delete("/products/:id", isLoggedAdmin, function (req, res) { //delelte product
    solarProduct.findByIdAndRemove(req.params.id, function (err) {
        if (err) {
            console.log("Error while Delete.");
            res.redirect("/products");
        } else
            res.redirect("/products");
    });
})


app.get("/userProfile",isLoggedUser,function (req,res) {  // profile page //Manage order
    if(req.user.isAdmin){
        transaction.find({}).sort({created: -1}).populate("userId").exec(function(err,AllTrans){
            if(err){
                console.log(err);
            }else{
                res.render("userProfile",{AllTrans:AllTrans});
            }
        })
    }else{
        user.findById(req.user._id).populate("transactions").exec(function(err,userWithTrans) {
            if(err){
                console.log(err);
            }else{
                res.render("userProfile",{currentUserWithTrans:userWithTrans});
            }
        })
    }  
})

app.post("/products/:id/buy",isLoggedUser,function(req,res) { // buy item,create transaction
    req.body.prize = req.body.quantity*req.body.prize;
    transaction.create(req.body,function (err,NewTrans) {
        if(err){
            res.redirect("/products/"+ req.params.is);
            console.log(err);
        }else{
            user.findById(req.user._id,function(err,foundUser) {
                foundUser.transactions.push(NewTrans);
                foundUser.save(function(err,arrayTrans) {
                    if(err){
                        console.log(err);
                        res.redirect("back");
                    }else{
                        //sending order notification
                        var OrederNotification = {
                           from: process.env.GU,
                           to: req.user.username,
                           subject: 'Order Confirmation',
                           text: 'You have Ordered item, Check your account.'
                        };
                        transporter.sendMail(OrederNotification, function (error, info) {
                            if (error) {
                               console.log(error);
                           } else {
                               console.log('Email sent: ' + info.response);
                           }
                        });
                        console.log(arrayTrans);
                        res.redirect("/userProfile");
                    }                   
                }); 
            })
        }
    })   
})

app.put("/updateStatus",isLoggedUser,function(req,res) {  // update status of order 
    transaction.findByIdAndUpdate(req.body.transId,{$set:{status:req.body.newStatus}}, {new: true},function(err,upTran) {
        if(err){
            res.redirect("/userProfile");
            console.log(err)
        }  
        else{
            res.redirect("/userProfile");
            console.log(upTran);
        }   
    });
})


// app.post("/login", passport.authenticate("local", { //login route is dummy
//     successRedirect: "/products",
//     failureRedirect: "/"
// }), function (req, res){
//     //sending email : login (login mail not worked)
//     console.log("Login..");
//     var loginNotification = {
//         from: process.env.GU,
//         to: req.user.username,
//         subject: 'Sending Email using Node.js',
//         text: 'Login kiya he tune bhagat'
//     };
//     transporter.sendMail(loginNotification, function(error, info) {
//         if (error) {
//             console.log(error);
//         } else {
//             console.log('Email sent: ' + info.response);
//         }
//     });
// })

//===================================================================================