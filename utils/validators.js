export const isValidEmail = (email)=>{
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isStrongPassword = (password) => {
    return password && password.length >= 6 && 
    /[a-z]/.test(password) && /[A-Z]/.test(password) &&
    /[0-9]/.test(password);
};