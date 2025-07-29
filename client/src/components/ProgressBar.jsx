import LoadingIcons from 'react-loading-icons';
function ProgressBar({position}) {
    return (
        <div className={`modelBoxContainer ${position}`} style={{zIndex:9999999}}>
            <div className='w-full h-full flex justify-center items-center acha'>
                <div style={{ width: '25%', height: '200px', borderRadius: '4px' }} className='flex justify-center items-center text-white'>
                    <span className='w-10 h-10'>
                        <LoadingIcons.Bars width={50} height={50} fill='rgb(114, 105, 239)' stroke="rgb(114, 105, 239)" strokeOpacity={.125} speed={.75} />
                    </span>
                </div>
            </div>
        </div>
    )
}

export default ProgressBar;
