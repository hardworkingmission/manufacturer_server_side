
const jwt=require('jsonwebtoken')

const verifyToken = (req,res,next) => {
    const authHeader=req.headers.authorization
    if(authHeader){
        const token=authHeader.split(' ')[1]
        //console.log(token)

        jwt.verify(token,process.env.ACCESS_SECRET,(err,decoded)=>{
            if(err){
                return res.status(401).send({message:'Access Forbidden'})
            }
            return req.decoded=decoded
            next()
        })

    }else{
        return res.status(403).send({message:'Unauthorized access'})
    }
    
};
module.exports= {verifyToken};