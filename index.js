const express=require('express')
const app=express()
const jwt=require('jsonwebtoken')
const cors=require('cors')
const mongoose=require('mongoose')
const port=process.env.PORT||5000
require('dotenv').config()


app.use(express.json())
app.use(cors({origin:true}))

//mongodb connection with mongoose
const uri=`mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.0qedn.mongodb.net/parts-manufacturer?retryWrites=true&w=majority`

const main=async()=>{
    await mongoose.connect(uri)
    const partsSchema=mongoose.Schema({
        name:String,
        img:String,
        description:String,
        minQuantity:Number,
        availableQuantity:Number,
        price:Number
    })
    const orderSchema=mongoose.Schema({
        name: String,
        email: String,
        phone: String,
        address: String,
        partsId: String,
        purchaseQuantity: Number

    })
    const Parts=mongoose.model('Part',partsSchema)
    const Order=mongoose.model('Order',orderSchema)

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

    //make order
    app.post('/order',async(req,res)=>{
        const order=req.body
        const result=await new Order(order)
        result.save()
        res.send(result)
        console.log(order)
    })

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

