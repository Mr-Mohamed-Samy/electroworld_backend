const {check,body}=require('express-validator')
const slugify =require('slugify')
const validationMiddleware = require('../../middleware/validationMidlleware')
const SubCategory = require('../../module/subCategoryShema')
const createProductValidator =[
    check('title')
        .isLength({min :3})
        .withMessage('title is too short')
        .isLength({max:50})
        .withMessage('title is too long')
        .notEmpty()
        .withMessage('Product title is required')
        .custom((val , {req})=>{
            req.body.slug = slugify(val)
            return true 
        }),  
    check('description')
        .notEmpty()
        .withMessage('Product descreption is required ')
        .isLength({max:2000})
        .withMessage('Product descreption is too long '),
    check('quantity')
        .notEmpty()
        .withMessage('Product is required')
        .isNumeric()
        .withMessage('Prodcuct quantity must be numeric value'),
    check('sold')
        .optional()
        .isNumeric()
        .withMessage('Sold mush be numeric value'),
    check('price')
        .notEmpty()
        .withMessage('price is required')
        .isNumeric()
        .withMessage('price mush be numeric value')
        .isLength({max:32}).withMessage('Price is too long'),
    check('priceAfterDiscount')
        .optional()
        .toFloat()
        .isNumeric()
        .withMessage('price mush be numeric value')
        .custom((value,{req})=>{
            if(req.body.price <= value){
                throw new Error('Pricer afrer discount must be lower than price')
            }
            return true
        }),
    
    check('images')
        .optional()
        .isArray()
        .withMessage('Images should be array of string'),
    check('colors')
        .optional()
        .isArray()
        .withMessage('Colors must be array of Sting '),
    check('category')
        .notEmpty(), 
        
    check('brand')
        .optional()
        .isMongoId()
        .withMessage('Invalid ID formate'),
    check('ratingsAverage')
        .optional()
        .isNumeric()
        .withMessage('ratingAverage musr be a number ')
        .isLength({min:1}).withMessage('Rating must be above or equal 1.0')
        .isLength({max:5}).withMessage('Rating must be less or equal 5.0'),
    check('ratingsQuantity')
        .optional()
        .isNumeric()
        .withMessage('ratingAverage musr be a number '),
        validationMiddleware
  ]
const getProductValidator = [
    check('id').isMongoId().withMessage('Invalid ID formate'),
    validationMiddleware,
  ]
  
const updateProductValidator = [
    check('id').isMongoId().withMessage('Invalid ID formate'),
    body('title')
    .optional()
    .custom((val , {req})=>{
             req.body.slug = slugify(val)
             return true 
         }),
      validationMiddleware,
  ]
  
const deleteProductValidator = [
    check('id').isMongoId().withMessage('Invalid ID formate'),
    validationMiddleware,
  ]

module.exports ={
    createProductValidator,
    getProductValidator,
    updateProductValidator,
    deleteProductValidator
}