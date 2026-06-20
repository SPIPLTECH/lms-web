export default function AuthInput({
    type,
    name,
    placeholder,
    onChange,
    }) {
    return ( <input
       type={type}
       name={name}
       placeholder={placeholder}
       onChange={onChange}
       className="
         w-full
         rounded-lg
         border
         border-slate-700
         bg-slate-800
         px-4
         py-3
         text-white
         outline-none
         focus:border-orange-500
       "
     />
    );
    }
    