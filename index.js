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
// 'sk_test_51L0fVGJAuQhoLxlY3QYc99FDERve5o6XpDCzCOV47CfTip32QVgasz2GudZuCCFqc1vNLApKwlp7xJvfM4Bfk2QW00WgmwdqNF'

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
        user:String

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

    //create or update a user
    app.put('/user/:email',async(req,res)=>{
        const email=req.params.email
        const user=req.body
        const newUser = await User.updateOne({email:email},{$set:{email:user.email,name:user.name}},{upsert:true})
        const token= jwt.sign({email:email},process.env.ACCESS_SECRET,{expiresIn:'5d'})
        res.send({token})
    })

    //get all parts
    app.get('/parts',async(req,res)=>{
        const parts= await Parts.find({})
        res.send(parts)
    })

    //get single item
    app.get('/partsItemById/:id',async(req,res)=>{
        const id=req.params.id
        const result= await Parts.findOne({_id:id})
        res.send(result)
    })

    //update quantity
    app.patch('/parts/:id',async(req,res)=>{
        const id=req.params.id
        const quantity=req.body
        const result= await Parts.updateOne({_id:id},{$set:quantity})
        res.send(result)
    })


     //make order
     app.post('/order',verifyToken,async(req,res)=>{
        const order=req.body
        const result=await new Order(order)
        result.save()
        res.send(result)
        sendOrderConfirmationEmail(result)
        //console.log(order)
    })

    //get order by for logged in user
    app.get('/orders',verifyToken,async(req,res)=>{
        const user=req.query.user
        const result= await Order.find({email:user})
        res.send(result)
        //console.log(user)
    })
    //get order by id
    app.get('/order/:id',verifyToken,async(req,res)=>{
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
        const order= await Order.findOneAndUpdate({_id:id},{$set:{paid:true,transactionId:paymentInfo?.transactionId}})
        sendPaymentConfirmationEmail(order)
        res.send(order)
        
        console.log('Patch',id,paymentInfo)
    })

    //delete a order
    app.delete('/deleteOrder/:id',verifyToken,async(req,res)=>{
        const id=req.params.id
        const result= await Order.deleteOne({_id:id})
        console.log(id)
        res.send(result)
    })

    //review creation
    app.post('/review',async(req,res)=>{
        res.send('review')

    })
    // get profile
    app.get('/myprofile',verifyToken,async(req,res)=>{
        const email=req.query.email
        const result= await MyProfile.findOne({email})
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

