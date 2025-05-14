# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr
from typing import Optional

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: bool = True
    # Add other common user fields here if needed

# Properties to receive via API on creation
class UserCreate(UserBase):
    email: EmailStr
    password: str # Password will be handled by Firebase Auth, but schema might expect it

# Properties to receive via API on update
class UserUpdate(UserBase):
    pass

class UserInDBBase(UserBase):
    id: Optional[str] = None # UID from Firebase

    class Config:
        orm_mode = True # Compatibility with ORMs, though Firebase is NoSQL
        from_attributes = True # Pydantic V2

# Additional properties to return via API
class User(UserInDBBase):
    pass

# Additional properties stored in DB
class UserInDB(UserInDBBase):
    # Hashed password if you were storing it, but Firebase handles this
    pass

