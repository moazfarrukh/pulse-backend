import { UniqueConstraintError, ValidationError } from 'sequelize';

// Helper function to handle Sequelize errors
export const handleSignupError = (error: unknown) => {
  if (error instanceof UniqueConstraintError) {
    const field = error.errors[0]?.path;
    const value = error.errors[0]?.value;
    
    if (field === 'email') {
      return {
        status: 409,
        response: {
          message: `Email '${value}' is already registered`,
          type: 'DUPLICATE_EMAIL',
          field: 'email'
        }
      };
    }
    
    if (field === 'username') {
      return {
        status: 409,
        response: {
          message: `Username '${value}' is already taken`,
          type: 'DUPLICATE_USERNAME',
          field: 'username'
        }
      };
    }
    
    return {
      status: 409,
      response: {
        message: `Duplicate value for field: ${field}`,
        type: 'DUPLICATE_CONSTRAINT',
        field
      }
    };
  }
  
  if (error instanceof ValidationError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path,
      message: err.message,
      value: err.value
    }));
    
    return {
      status: 400,
      response: {
        message: 'Validation failed',
        type: 'VALIDATION_ERROR',
        errors: validationErrors
      }
    };
  }
  
  // Default error response
  return {
    status: 500,
    response: {
      message: 'Server error',
      type: 'INTERNAL_ERROR'
    }
  };
};
export default handleSignupError;