// ObjViewer.js
 
// 全局变量
var gl;						// WebGL上下文

// 以下全局变量用于控制动画的状态和速度
var angleY = 0.0;		// 绕y轴旋转的角度
var angleX = 0.0;		// 绕x轴旋转的角度
var angleStep = 3.0;	// 角度变化步长(3度)

// shader中变量的索引
var attribIndex = new AttribIndex();  	// shader中attribute变量索引
var mtlIndex = new MTLIndex();	// shader中材质变量索引
var u_ModelView;		// shader中uniform变量"u_ModelView"的索引

var lightPosition = vec4(0, 20, 0, 1); 		// 光源位置(观察坐标系)
var ambientLight = vec3(1.0, 1.0, 1.0); 	// 环境光
var diffuseLight = vec3(0.8, 0.8, 0.8); 	// 漫反射光
var specularLight = vec3(1.0, 1.0, 1.0);	// 镜面反射光

// 开始读取Obj模型(异步方式)，返回OBJModel对象
var obj = loadOBJ("Res\\Saber.obj");

// 页面加载完成后会调用此函数，函数名可任意(不一定为main)
window.onload = function main(){
	// 获取页面中id为webgl的canvas元素
    var canvas = document.getElementById("webgl");
	if(!canvas){ // 获取失败？
		alert("获取canvas元素失败！"); 
		return;
	}
	
	// 利用辅助程序文件中的功能获取WebGL上下文
	// 成功则后面可通过gl来调用WebGL的函数
    gl = WebGLUtils.setupWebGL(canvas);    
    if (!gl){ // 失败则弹出信息
		alert("获取WebGL上下文失败！"); 
		return;
	}        
	
	/*设置WebGL相关属性*/
    gl.clearColor(0.5, 0.5, 0.5, 1.0); // 设置背景色为灰色
	gl.enable(gl.DEPTH_TEST);	// 开启深度检测
	gl.enable(gl.CULL_FACE);	// 开启面剔除，默认剔除背面
	// 设置视口，占满整个canvas
	gl.viewport(0, 0, canvas.width, canvas.height);
	// 设置投影矩阵：透视投影，根据视口宽高比指定视域体
	var matProj = perspective(35.0, 		// 垂直方向视角
		canvas.width / canvas.height, 	// 视域体宽高比
		1.0, 							// 相机到近裁剪面距离
		100.0);							// 相机到远裁剪面距离
	
	/*加载shader程序并为shader中attribute变量提供数据*/
	// 加载id分别为"vertex-shader"和"fragment-shader"的shader程序，
	// 并进行编译和链接，返回shader程序对象program
    var program = initShaders(gl, "vertex-shader", 
		"fragment-shader");
    gl.useProgram(program);	// 启用该shader程序对象 
	
	// 获取名称为"a_Position"的shader attribute变量的位置
    var a_Position = gl.getAttribLocation(program, "a_Position");
	if(a_Position < 0){ // getAttribLocation获取失败则返回-1
		alert("获取attribute变量a_Position失败！"); 
		return;
	}	

	// 获取名称为"a_Normal"的shader attribute变量的位置
    var a_Normal = gl.getAttribLocation(program, "a_Normal");
	if(a_Normal < 0){ // getAttribLocation获取失败则返回-1
		alert("获取attribute变量a_Normal失败！"); 
		return;
	}	
	
	// 初始化attribIndex
	// 注意顺序不要错，分别为顶点坐标、法向和纹理坐标的索引
	// 如果shader中没有相关变量则传-1
	attribIndex.init(a_Position, a_Normal, -1);
	
	// 获取名称为"u_ModelView"的shader uniform变量位置
	u_ModelView = gl.getUniformLocation(program, "u_ModelView");
	if(!u_ModelView){
		alert("获取uniform变量u_ModelView失败！")
		return;
	}
	
	// 获取名称为"u_Projection"的shader uniform变量位置
	var u_Projection = gl.getUniformLocation(program, "u_Projection");
	if(!u_Projection){
		alert("获取uniform变量u_Projection失败！")
		return;
	}
	// 传值给shader中的u_Projection
	gl.uniformMatrix4fv(u_Projection, false, flatten(matProj));
	
	// 获取名称为"u_LightPosition"的shader uniform变量位置
	var u_LightPosition = gl.getUniformLocation(program, "u_LightPosition");
	if(!u_LightPosition){
		alert("获取uniform变量u_LightPosition失败！")
		return;
	}
	// 给光源位置传值
	gl.uniform4fv(u_LightPosition, flatten(lightPosition));
	
	// 获取名称为"u_AmbientLight"的shader uniform变量位置
	var u_AmbientLight = gl.getUniformLocation(program, "u_AmbientLight");
	if(!u_AmbientLight){
		alert("获取uniform变量u_AmbientLight失败！")
		return;
	}
	// 获取名称为"u_DiffuseLight"的shader uniform变量位置
	var u_DiffuseLight = gl.getUniformLocation(program, "u_DiffuseLight");
	if(!u_DiffuseLight){
		alert("获取uniform变量u_DiffuseLight失败！")
		return;
	}
	// 获取名称为"u_SpecularLight"的shader uniform变量位置
	var u_SpecularLight = gl.getUniformLocation(program, "u_SpecularLight");
	if(!u_SpecularLight){
		alert("获取uniform变量u_SpecularLight失败！")
		return;
	}
	
	// 给光源的三种光颜色传值
	gl.uniform3fv(u_AmbientLight, flatten(ambientLight));
	gl.uniform3fv(u_DiffuseLight, flatten(diffuseLight));
	gl.uniform3fv(u_SpecularLight, flatten(specularLight));
		
	// 获取shader中uniform材质变量索引
	var u_Kd = gl.getUniformLocation(program, "u_Kd");
	var u_Ks = gl.getUniformLocation(program, "u_Ks");
	var u_Ka = gl.getUniformLocation(program, "u_Ka");
	var u_Ke = gl.getUniformLocation(program, "u_Ke");
	var u_Ns = gl.getUniformLocation(program, "u_Ns");
	var u_d = gl.getUniformLocation(program, "u_d");
	if(!u_Kd || !u_Ks || !u_Ka || !u_Ke || !u_Ns || !u_d){
		alert("获取uniform材质变量失败！")
		return;	
	}
	// 初始化mtlIndex，参数顺序不要错！
	// 依次为漫反射系数索引、镜面反射系数索引、环境反射系数索引、
	// 发射系数索引、高光系数、不透明度
	// 如果shader中没有相关变量则传0
	mtlIndex.init(u_Kd, u_Ks, u_Ka, u_Ke, u_Ns, u_d);
	
	// 进行绘制
    render();
};

// 绘制函数
function render() {
	// 检查是否一切就绪，否则请求重绘，并返回
	// 这样稍后系统又会调用render重新检查相关状态
	if(!obj.isAllReady(gl)) {
		requestAnimFrame(render); // 请求重绘
		return;	// 返回
	}
	
	// 清颜色缓存和深度缓存
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
	// 创建变换矩阵
	var matModelView = 
		mult(translate(0.0, 0.0, -20.0), 	// 沿z轴平移
		mult(rotateY(angleY),	     		// 绕y轴旋转
		rotateX(angleX)));		     		// 绕x轴旋转
	
	// 传值给shader中的u_ModelView
	gl.uniformMatrix4fv(u_ModelView, false, flatten(matModelView));
	
	// 绘制obj模型，没有用到纹理采样器
	obj.draw(gl, attribIndex, mtlIndex, 0);
}

// 按键响应
// 用于控制视角
window.onkeydown = function(){
	switch(event.keyCode){
		case 37: // 方向键Left
			angleY -= angleStep;
			if (angleY < -180.0) {
				angleY += 360.0;
			}
			break;
		case 38: // 方向键Up
			angleX -= angleStep;
			if (angleX < -80.0) {
				angleX = -80.0;
			}
			break;
		case 39: // 方向键Right
			angleY += angleStep;
			if (angleY > 180.0) {
				angleY -= 360.0;
			}
			break;
		case 40: // 方向键Down
			angleX += angleStep;
			if (angleX > 80.0) {
				angleX = 80.0;
			}
			break;
		default:
			return;
	}
	requestAnimFrame(render); // 请求重绘
}
