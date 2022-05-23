const sgMail = require('@sendgrid/mail')
sgMail.setApiKey('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')

const sendOrderConfirmationEmail = (order) => {

    const msg = {
    to: order?.email, // Change to your recipient
    from: 'sshakil496@gmail.com', // Change to your verified sender
    subject: 'Order Confirmation',
    text: `Orderded parts:${order?.partsName}`,
    html: `
    <h4>Thank you for your Order</h4>
    <p>Your Order Id:${order?._id}</p>
    
    `,
    }
    sgMail
    .send(msg)
    .then(() => {
        console.log('Email sent')
    })
    .catch((error) => {
        console.error(error)
    })
}

module.exports={ sendOrderConfirmationEmail};