const express=require('express')
const app=express()
const jwt=require('jsonwebtoken')
const {sendOrderConfirmationEmail}=require('./sendOrderConfirmationEmail')
const {sendPaymentConfirmationEmail}=require('./sendPaymentConfirmationEmail')
const {verifyToken}=require('./verifyToken')
const cors=require('cors')
const mongoose=require('mongoose')
const port=process.env.PORT||5000
require('dotenv').config()

const stripe = require("stripe")(process.env.SECRET_KEY);

app.use(express.json())
app.use(cors({origin:true}))

//mongodb connection with mongoose
const uri=`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.0qedn.mongodb.net/parts-manufacturer?retryWrites=true&w=majority`

const main=async()=>{
    await mongoose.connect(uri)
    const partsSchema= new mongoose.Schema({
        name:String,
        img:String,
        description:String,
        minQuantity:Number,
        availableQuantity:Number,
        price:Number
    })
    const orderSchema=new mongoose.Schema({
        name: String,
        email: String,
        phone: String,
        address: String,
        partsId: String,
        totalPrice:Number,
        partsName:String,
        purchaseQuantity: Number,
        img:String,
        paid:Boolean,
        status:String,
        transactionId:String

    })
    const userSchema= new mongoose.Schema({
        name:String,
        email:String,
        role:String

    })
    const paymentScema= new mongoose.Schema({
        order:String,
        transactionId:String
    })
    const reviewSchema= new mongoose.Schema({
        img:String,
        comment:String,
        ratings:String,
        name:String,
        address:String

    })
    const myProfileSchema= new mongoose.Schema({
        img:String,
        name:String,
        email:String,
        phone:String,
        address:String,
        socialMediaProfile:String
    })

    const Parts=new mongoose.model('Part',partsSchema)
    const Order= new mongoose.model('Order',orderSchema)
    const User= new mongoose.model('User',userSchema)
    const Payment= new mongoose.model('Payment',paymentScema)
    const Review= new mongoose.model('Review',reviewSchema)
    const MyProfile= new mongoose.model('MyProfile',myProfileSchema)

     //general user
     const verifyGeneralUser=async(req,res,next)=>{
        const decodedEmail=req?.decoded.email
        const user= await User.findOne({email:decodedEmail})
        if(user?.role!=='admin'){
            next()
        }else{
            res.status(403).send({message:'Unauthorized access'})
        }

     }

    //admin verify
    const verifyAdmin=async(req,res,next)=>{
        const decodedEmail=req.decoded.email
        const user= await User.findOne({email:decodedEmail})
        if(user?.role==='admin'){
            next()
        }else{
            res.status(403).send({message:'Unauthorized access'})
        }

    }
    //get admin user by id
    app.get('/admin/:email',verifyToken,async(req,res)=>{
        const email= req.params.email
        const user= await User.findOne({email})
        if(user?.role==='admin'){
            res.send({admin:true})
        }else{
            res.send({admin:false})
        }
    })

    //create or update a user
    app.put('/user/:email',async(req,res)=>{
        const email=req.params.email
        const user=req.body
        const newUser = await User.findOneAndUpdate({email:email},{$set:{email:user.email,name:user.name}},{upsert:true})
        const token= jwt.sign({email:email},process.env.ACCESS_SECRET,{expiresIn:'5d'})
        res.send({token})
    })

    //get all user by admin
    app.get('/allusers',verifyToken,verifyAdmin,async(req,res)=>{
        const result =await User.find({})
        res.send(result)
    })

    //make Admin By Admin
    app.patch('/makeAdminByAdmin/:id',verifyToken,verifyAdmin,async(req,res)=>{
        const userId= req.params.id
        const adminInfo= req.body
        const decodedEmail=req.decoded.email
        const user= await User.findOne({email:decodedEmail})
        if(user.role==="admin"){
            const result= await User.findOneAndUpdate({_id:userId},{$set:adminInfo})
            res.send(result)
        }
    })

    //get all parts
    app.get('/parts',async(req,res)=>{
        const parts= await Parts.find({})
        res.send(parts)
    })

    //get single item
    app.get('/partsItemById/:id',verifyToken,async(req,res)=>{
        const id=req.params.id
        const result= await Parts.findOne({_id:id})
        res.send(result)
    })

    //parts creation
    app.post('/parts',verifyToken,verifyAdmin,async(req,res)=>{
        const partsInfo=req.body
        const result= await new Parts(partsInfo)
        result.save()
        res.send(result)
    })

    //update parts
    app.patch('/parts/:id',verifyToken,verifyAdmin,async(req,res)=>{
        const id=req.params.id
        const partsInfo=req.body
        const result= await Parts.findOneAndUpdate({_id:id},{$set:partsInfo})
        res.send(result)
    })

    //delete a parts
    app.delete('/deleteParts/:id',verifyToken,verifyAdmin,async(req,res)=>{
        const id=req.params.id
        const result = await Parts.deleteOne({_id:id})
        res.send(result)
    })

    //update quantity
    app.patch('/partsQuantity/:id',verifyToken,async(req,res)=>{
        const id=req.params.id
        const quantity=req.body
        const result= await Parts.findOneAndUpdate({_id:id},{$set:quantity})
        res.send(result)
    })
     
    //get all orders
    app.get('/allorders',verifyToken,verifyAdmin,async(req,res)=>{
        const result= await Order.find({})
        res.send(result)
    })
    
    //get all orders public
    app.get('/allorderspublic',async(req,res)=>{
        const result= await Order.find({})
        res.send(result)
    })

     //make order
     app.post('/order',verifyToken,async(req,res)=>{
        const order=req.body
        const result=await new Order(order)
        result.save()
        res.send(result)
        sendOrderConfirmationEmail(result)
    })

    //get order by for logged in user
    app.get('/orders',verifyToken,verifyGeneralUser,async(req,res)=>{
        const user=req.query.user
        const result= await Order.find({email:user})
        res.send(result)
    })

    //get order by id
    app.get('/orderById/:id',verifyToken,async(req,res)=>{
        const id=req.params.id
        const result= await Order.findOne({_id:id})
        res.send(result)
    })

    //update order
    app.patch('/order/:id',verifyToken,async(req,res)=>{
        const id=req.params.id
        const paymentInfo=req.body
        const result= await new Payment(paymentInfo)
        result.save()
        const order= await Order.findOneAndUpdate({_id:id},{$set:{status:paymentInfo?.status,paid:true,transactionId:paymentInfo?.transactionId}})
        sendPaymentConfirmationEmail(order)
        res.send(order)
    })

    //delete a order by user
    app.delete('/deleteOrderByUser/:id',verifyToken,verifyGeneralUser,async(req,res)=>{
        const id=req.params.id
        const result= await Order.deleteOne({_id:id})
        res.send(result)
    })
    
    //delete a order by admin
    app.delete('/deleteOrderByAdmin/:id',verifyToken,verifyAdmin,async(req,res)=>{
        const id=req.params.id
        const result= await Order.deleteOne({_id:id})
        res.send(result)
    })

     //get reviews
     app.get('/reviews',async(req,res)=>{
         const reviews= await Review.find({})
         res.send(reviews)
     })

    //review creation
    app.post('/review',verifyToken,verifyGeneralUser,async(req,res)=>{
        const reviewInfo=req.body
        const result= await new Review(reviewInfo)
        result.save()
        res.send(result)

    })

    // get profile
    app.get('/myprofile/:email',verifyToken,async(req,res)=>{
        const email=req.params.email
        const result= await  MyProfile.findOne({email})
        res.send(result)

    })

    //profile creation
    app.post('/myprofile',verifyToken,async(req,res)=>{
        const profileInfo=req.body
        const result= await new MyProfile(profileInfo)
        result.save()
        res.json(result)

    })

    //profile update
    app.put('/updateprofile/:email',verifyToken,async(req,res)=>{
        const email=req.params.email
        const profileInfo=req.body
        const result= await MyProfile.findOneAndUpdate({email},{$set:profileInfo},{upsert:true})
        res.send(result)
    })

    //paymant method integration
    app.post("/create-payment-intent",verifyToken, async (req, res) => {
        const price  = req.body.price;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: 100*parseInt(price),
          currency: "usd",
          payment_method_types: ["card"]
        });
      
        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      });

    console.log('Connected')
}
main().catch(err=>console.log(err))

//initial routing
app.get('/',async(req,res)=>{
    res.send('Welcome to manufacturer website')
})

//listening on port
app.listen(port,()=>{
    console.log("Listening on:",port)
})

