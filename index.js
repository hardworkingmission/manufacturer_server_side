const express=require('express')
const app=express()
const jwt=require('jsonwebtoken')
const cors=require('cors')
const mongoose=require('mongoose')
const port=process.env.PORT||5000
require('dotenv').config()


app.use(express.json())
app.use(cors({origin:true}))

//initial routing
app.get('/',async(req,res)=>{
    res.send('Welcome to manufacturer website')
})

//listening on port
app.listen(port,()=>{
    console.log("Listening on:",port)
})

