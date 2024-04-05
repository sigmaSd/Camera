use serde::{Deserialize, Serialize};
use std::ffi::CString;
mod utils;
use utils::{boxed_error_to_cstring, cstr_json_to_type, type_to_json_cstr};

pub type Result<T> = std::result::Result<T, Box<dyn std::error::Error>>;

#[derive(Debug, Serialize, Deserialize, PartialEq, Eq)]
struct World {
    size: usize,
}

/// Struct that increases the world size by saying hello
pub struct HelloStruct {}
impl HelloStruct {
    fn new() -> Self {
        Self {}
    }
    fn hello(&self, world: World) -> World {
        World {
            size: world.size + 1,
        }
    }
}

#[no_mangle]
// can't use new since its a reserved keyword in javascript
pub extern "C" fn create() -> *const HelloStruct {
    Box::into_raw(Box::new(HelloStruct::new()))
}

#[no_mangle]
/// # Safety
/// expects
/// - valid ptr to a HelloStruct
/// - valid ptr to a World struct encoded as CString encoding a JSON value
/// - A buffer to write the result to which can be eitehr:
/// - - a pointer to new HelloStruct
/// - - an error encoded as CString
/// ->  returns 0 on success and -1 on error
pub unsafe extern "C" fn hello(this: *mut HelloStruct, world: *mut i8, result: *mut usize) -> i8 {
    let this = unsafe { &mut *this };
    #[allow(clippy::blocks_in_conditions)]
    match (|| -> Result<CString> {
        //SAFETY: world is valid by the guarentee of the parent function
        let world: World = unsafe { cstr_json_to_type(world)? };
        type_to_json_cstr(&this.hello(world))
    })() {
        Ok(new_world) => {
            *result = new_world.into_raw() as _;
            0
        }
        Err(err) => {
            *result = boxed_error_to_cstring(err).into_raw() as _;
            -1
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_works() {
        let hello = HelloStruct::new();
        assert_eq!(hello.hello(World { size: 2 }), World { size: 3 });
    }
}
