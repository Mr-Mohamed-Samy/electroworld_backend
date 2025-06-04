
const asyncHandler=require('express-async-handler')
const factory = require('./handlerFactory')
const ApiError = require('../utils/apiError');

const User = require('../module/userSchema');
const Product = require('../module/productSchema');
const Cart = require('../module/cartSchema');
const Order = require('../module/orderSchema');

// @desc    create cash order
// @route   POST /api/v1/orders/cartId
// @access  Protected/User
exports.createCashOrder = asyncHandler(async(req,res,next)=>{
    const taxPrice = 0;
    const shippingPrice = 0 //!FIXME

    console.log(req.params.cartId)
    const cart = await Cart.findById(req.params.cartId)
    if(!cart){
        return next(new ApiError(`there is no cart with this id ${req.params.cartId} `,404))
    }
     // Get order price depend on cart price "Check if coupon apply"
    const cartPrice = cart.totalPriceAfterDiscount 
    ? cart.totalPriceAfterDiscount 
    : cart.totalCartPrice

    const totalOrderPrice = cartPrice + taxPrice + shippingPrice

    //Create order with default paymentMethodType cash
    const order = await Order.create({
        user: req.user._id,
        cartItems: cart.cartItems,
        shippingAddress: req.body.shippingAddress,
        totalOrderPrice,
    })

  //  After creating order, decrement product quantity, increment product sold
    if (order) {
        const bulkOption = cart.cartItems.map((item) => ({
          updateOne: {
            filter: { _id: item.product },
            update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
          },
        }));
        await Product.bulkWrite(bulkOption, {});
    //  Clear cart depend on cartId
    await Cart.findByIdAndDelete(req.params.cartId)

    res.status(201).json({ status: 'success', data: order })}
})

exports.filterOrderForLoggedUser = asyncHandler(async (req, res, next) => {
  if (req.user.role === 'user') req.filterObj = { user: req.user._id }
  next()
})
// @desc    Get all orders
// @route   POST /api/v1/orders
// @access  Protected/User-Admin-Manager
exports.findAllOrders = asyncHandler(async (req, res, next) => {
  const filter = req.filterObj || {};
  const orders = await Order.find(filter)
    .populate({ path: 'user', select: 'name' }) 
    .populate({ path: 'cartItems.product', select: 'title price ' }); 

  res.status(200).json({
    status: 'success',
    results: orders.length,
    data: orders,
  });
});


// @desc    Get all orders
// @route   POST /api/v1/orders
// @access  Protected/User-Admin-Manager
exports.findSpecificOrder = factory.getOne(Order);

// @desc    Update order paid status to paid
// @route   PUT /api/v1/orders/:id/pay
// @access  Protected/Admin-Manager
exports.updateOrderToPaid = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(
      new ApiError(
        `There is no such a order with this id:${req.params.id}`,
        404
      )
    );
  }
    // update order to paid
    order.isPaid = true;
    order.paidAt = Date.now()
  
    const updatedOrder = await order.save()
  
    res.status(200).json({ status: 'success', data: updatedOrder })
  })
  // @desc    Update order delivered status
// @route   PUT /api/v1/orders/:id/deliver
// @access  Protected/Admin-Manager
exports.updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(
      new ApiError(
        `There is no such a order with this id:${req.params.id}`,
        404
      )
    );
  }

  // update order to paid
  order.isDelivered = true;
  order.deliveredAt = Date.now()

  const updatedOrder = await order.save()

  res.status(200).json({ status: 'success', data: updatedOrder })
})


