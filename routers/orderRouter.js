const express = require('express')

const authService = require('../controller/authUser')

const {
    createCashOrder ,
    filterOrderForLoggedUser ,
    findAllOrders ,
    findSpecificOrder,
    updateOrderToPaid,
    updateOrderToDelivered
} = require('../controller/orderController')



const router = express.Router()

router.use(authService.protect)


router.post('/:cartId',authService.allowedTo('user'),createCashOrder)

router.get(
    '/',
    authService.allowedTo('user','admin','manger'),
    filterOrderForLoggedUser,
    findAllOrders
)

router.get('/:id',findSpecificOrder)

router.put(
    '/:id/pay',
    authService.allowedTo('admin', 'manager'),
    updateOrderToPaid
  )
  router.put(
    '/:id/deliver',
    authService.allowedTo('admin', 'manager'),
    updateOrderToDelivered
  );
module.exports = router


