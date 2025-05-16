import { ICustomer, ICustomerCreate } from "../interfaces/customer.interface";
import Customer from "../models/Customer";
import User from "../models/User";
import AppError from "../utils/errors/AppError";
import logger from "../utils/logger";

class CustomerService {

    // add a customer
    async addCustomer(businessId: string, customerData: Partial<ICustomerCreate>): Promise<ICustomer> {
        try{ 
            logger.info(`Add customer service called with data: ${JSON.stringify(customerData)}`);
            // ensure there is a valid user Id
            const user = await User.findById(businessId);
            if(!user){
                throw new AppError('User not found', 404);
            }

            // create the customer
            const customer = await Customer.create({ 
                business: businessId,
                ...customerData,
            });

            logger.info(`Created customer: ${customer.name} for business: ${businessId}`);

            return customer;
        } catch (error: any) {
            logger.error('Error creating customer:', error);
            throw new AppError(`Failed to create customer: ${error.message}`, 500);
        }
    }

    // get all customers for a business
    async getCustomers(businessId: string): Promise<ICustomer[]> {
        return await Customer.find({ business: businessId });
    }

    // get a specific customer by name or Id 
    async getSpecificCustomer(customerIdOrName: string, businessId: string): Promise<ICustomer> { 
        let customer 
        try{ 
            customer = await Customer.findOne({ 
                business: businessId,
                name: new RegExp(customerIdOrName, 'i'),
            });
        } catch (error: any) {
            customer = await Customer.findOne({ 
                business: businessId,
                _id: customerIdOrName,
            });
        }

        if(!customer){
            throw new AppError(`Customer ${customerIdOrName} not found`, 404);
        }
        return customer;
    }
    
    // delete a customer
    async deleteCustomer(customerName: string, businessId: string): Promise<void> {
        logger.info(`Deleting customer: ${customerName} for business: ${businessId}`);
        const customer = await Customer.findOne({ business: businessId, name: new RegExp(customerName, 'i') });
        if(!customer){
            throw new AppError(`Customer ${customerName} not found`, 404);
        }

        // TODO:: handle case where there are multiple customers
        await Customer.findByIdAndDelete({_id: customer._id})
    }

    formatCustomerList(customers: ICustomer[]): string {
        if (customers.length === 0) {
            return "You have no saved customers. Use 'customer add [name] [phone]' to add one.";
        }
    
        let result = customers.length > 1 ? `👥 *Your Customers* 👥\n\n` : `👥 *${customers[0].name} Details* 👥\n\n`;
    
        customers.forEach((customer, index) => {
            result += `${index + 1}. *${customer.name}*\n`;
            if (customer.phone) {   
                result += `   📞 Phone: ${customer.phone}\n`;
            }
            
            if (customer.totalSpent) {
                result += `   💵 Total Spent: ₦${customer.totalSpent.toLocaleString()}\n`;
            }
    
            if (customer.lastPurchaseDate) {
                result += `   📅 Last Purchase: ${new Date(customer.lastPurchaseDate).toLocaleDateString()}\n`;
            }
    
            if (customer.tags && customer.tags.length > 0) {
                result += `   🏷️ Tags: ${customer.tags.join(', ')}\n`;
            }
    
            // Add spacing between customers
            result += `\n`;
        });
    
        return result.trim(); // Remove the trailing newline
    }
    
}

export default new CustomerService();