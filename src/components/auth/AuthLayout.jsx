export default function AuthLayout({
    children,
    title,
    subtitle,
    }) {
    return ( <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6"> <div className="w-full max-w-md"> <div className="text-center mb-8"> <h1 className="text-4xl font-bold text-white">
    Orange LMS </h1>
    

          <p className="text-slate-400 mt-2">
            {subtitle}
          </p>
        </div>
    
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-semibold text-white mb-6">
            {title}
          </h2>
    
          {children}
        </div>
      </div>
    </div>
    
    );
    }
    