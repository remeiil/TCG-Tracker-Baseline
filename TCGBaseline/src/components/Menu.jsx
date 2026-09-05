export default function Menu() {
    return (

<div className='dropdown'>
            <h1><i className='fa-solid fa-bars'></i></h1>
            <div className='dropdown-content br05 border-sage bg-white font-black p1 shadow-subtle'>
              <ul className='list-style-none link-style-none'>
                <li><a href="/"><i className="fa-solid fa-house"></i> Home</a></li>
                <li><a href="/update"><i className="fa-solid fa-database"></i> Update Database</a></li>
                <li><a href="/market"><i className="fa-solid fa-chart-line"></i> Add Current Price</a></li>
                <hr className='m05' />
                <h4>My Account</h4>
                <li><i className="fa-solid fa-right-to-bracket"></i> Login</li>
                <li><i className="fa-solid fa-right-from-bracket"></i> Logout</li>
                <li><i className="fa-solid fa-user-plus"></i> Register</li>
                <li><i className="fa-solid fa-box-archive"></i> My Cards</li>
              </ul>
            </div>
        </div>
    )
}