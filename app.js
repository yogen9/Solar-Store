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
mongo.connect("mongodb://localhost/solar", {
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
    created: {
        type: Date,
        default: Date.now
    }
})
var solarProduct = mongo.model("solarProduct", solarItems);

//Authetication Schema 
var userSchema = new mongo.Schema({
    username: String,
    password: String
});
userSchema.plugin(passportLocalMongoose);
var user = mongo.model("user", userSchema);

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

//mail settings
var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'yogen0095@gmail.com',
        pass: 'yogen@popat96'
    }
});

//=========================================================================
//listener
app.listen(3000, function () {
    console.log("Server started at 3000...")
});

//=========================================================================

// middleware
function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.flash("error", "You are not Logged in,Login First ");
    res.redirect("/");
}

app.use(function (req, res, next) { ///executes on every single routes
    res.locals.currentUser = req.user; //for giving logged user info
    res.locals.success = req.flash("success"); //for success and error flash this
    res.locals.error = req.flash("error"); // this two variables sends in all routes while flash
    next(); // here req."user" not same as user.....
});

//=========================================================================
//Routes 
app.get("/", function (req, res) { //home page
    res.render("home");
})

app.post("/", function (req, res) { // for registration
    var newUser = new user({
        username: req.body.username
    });
    user.register(newUser, req.body.password, function (err, user) {
        if (err) {
            console.log("Error while register : " + err);
            return res.render("/");
        }
        //sending mail : signup
        passport.authenticate("local")(req, res, function () {
            var signUpNotification = {
                from: 'yogen0095@gmail.com',
                to: req.user.username,
                subject: 'Sending Email using Node.js',
                text: 'signUp kiya he tune bhagat'
            };
            transporter.sendMail(signUpNotification, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });
            req.flash("success","Registered Successfully");
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
                from: 'yogen0095@gmail.com',
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
            req.flash("success", "Logged in Successfully " + "");
            return res.redirect("/products");
        });
    })(req, res, next);
});

app.get("/logout", function (req, res) { //logout 
    req.logout();
    req.flash("success", "Logged out successfully...");
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

app.post("/products", isLoggedIn, function (req, res) { //adding new item to db
    if (!req.files)
        return console.log("No files were uploaded.");
    else
        console.log(req.files);

    req.body.img = "../images/" + req.files.img.name;
    console.log(req.body);

    //setting for server path where uploded file saved
    path = "./public/images/" + req.files.img.name;
    imgfile = req.files.img;
    imgfile.mv(path, function (err) {
        if (err)
            console.log("Error while Upload");
        else
            console.log("Successfully uploaded.");
    });

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

app.put("/products/:id", isLoggedIn, function (req, res) { //edit product 
    console.log(req.body);
    solarProduct.findByIdAndUpdate(req.params.id, req.body, function (err, solarProduct) {
        if (err) {
            console.log("Error while Update.");
            res.redirect("/products");
        } else
            res.redirect("/products/" + req.params.id);
    });
})

app.delete("/products/:id", isLoggedIn, function (req, res) { //delelte product
    solarProduct.findByIdAndRemove(req.params.id, function (err) {
        if (err) {
            console.log("Error while Delete.");
            res.redirect("/products");
        } else
            res.redirect("/products");
    });
})

// app.post("/login", passport.authenticate("local", { //login route is dummy
//     successRedirect: "/products",
//     failureRedirect: "/"
// }), function (req, res){
//     //sending email : login (login mail not worked)
//     console.log("Login..");
//     var loginNotification = {
//         from: 'yogen0095@gmail.com',
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