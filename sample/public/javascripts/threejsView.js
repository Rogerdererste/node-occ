/**
 *
 *
 */
var container,
    scene,
    renderer,
    camera,
    controls,
    editor,
    myLayout,
    COG = new THREE.Vector3() ;

var lightContainer;

function installLayout() {
    // $('#container').layout({ applyDemoStyles: true });
    myLayout = $('body').layout(
        {
            west__onresize:    function(x, ui) {
                editor.resize();
            },
            center__onresize:  function(x, ui) {
                // resize webgl view
                onWindowResize();
            }
        }
    );
    myLayout.sizePane("west", 400);
}


function zoomAll()
{
    "use strict";
    // get scene bounding box
    var bbox = scene.boundingSphere();

    var distToCenter = bbox.radius/Math.sin(camera.fov);

    // camera
}



$(document).ready(function() {
    "use strict";

    installLayout();

    installEditor();

    installSpinnerOnAjaxCall();

    restoreUserSession();

    container = $("#graphical_view");
    if (container.size() === 0 ) {
        throw Error("Cannot find graphical view div");
    }
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(25, container.width()/container.height(), 1, 100000);
    camera.position.z = 100;


    renderer =  new THREE.WebGLRenderer( { antialias: true, clearColor: 0x121212, clearAlpha: 1 } );
    renderer.setClearColorHex(0x121212, 1.0);
    renderer.clear();


    // make sure canvas can get focus;
    // see http://jsfiddle.net/erossignon/bFraK/3/
    renderer.domElement.setAttribute('tabindex','0');
    container.append(renderer.domElement);


    controls = new THREE.TrackballControls( camera , container[0]);


    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;

    controls.noZoom = false;
    controls.noPan = false;

    controls.staticMoving = false;
    controls.dynamicDampingFactor = 0.3;
    var radius =1;
    controls.minDistance = radius * 1.1;
    controls.maxDistance = radius * 10000;

    controls.keys = [ /*A*/65, /*S*/ 83, /*D*/68 ];

    controls.addEventListener( 'change', function() {

    });




    lightContainer = new THREE.Object3D();
    lightContainer.matrixWorld = camera.matrix;
    lightContainer.matrixAutoUpdate = false;

    scene.add(lightContainer);

    for (var x= -1 ; x<2;x=x+2) {
        for (var y= -1 ; y<2;y=y+2) {
            for (var z= -1 ; z<2;z=z+2) {

                var pointLight =  new THREE.PointLight( 0xFFFFFF,0.2 );
                pointLight.position.x = 100 * x;
                pointLight.position.y = 100 * y;
                pointLight.position.z = 100 * z;
                pointLight.matrixAutoUpdate = true;

                lightContainer.add(pointLight);
                lightContainer.add(new THREE.PointLightHelper(pointLight,10));
            }
        }
    }



    var light = new THREE.AmbientLight( 0x222222 );
    scene.add( light );

    animate();

    onWindowResize();


    $("#button").click(send_and_build_up_csg);

});

function onWindowResize( event ) {


    SCREEN_WIDTH = container.width();
    SCREEN_HEIGHT = container.height();


    renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
    camera.aspect = SCREEN_WIDTH / SCREEN_HEIGHT;
    camera.updateProjectionMatrix();



}

function animate() {
    "use strict";
    requestAnimationFrame( animate );
    controls.update();
    render();
    updateAJS();
}

function render() {
    renderer.render( scene, camera );
}

function boundingBox(obj) {

     if (obj instanceof THREE.Mesh) {

        var geometry = obj.geometry;

        geometry.computeBoundingBox();

        return  geometry.boundingBox;


    }
    if (obj instanceof THREE.Object3D) {

        var bb = new THREE.Box3();
        for (var i=0;i < obj.children.length;i++) {
            bb.union(boundingBox(obj.children[i]));
        }
        return bb;
    }
}
function shapeCenterOfGravity(obj) {

    return boundingBox(obj).center();
}
var lastAjaxStart ;
var lastAjaxDuration;
var delay;

function restoreUserSession() {
    var script = decodeURIComponent(localStorage.getItem("myscript"));
    if (script) {
        editor.setValue(script);
        editor.gotoLine(1,1,false);
        editor.clearSelection();        
    }
}

function saveUserSession() {
    var script = encodeURIComponent(editor.getValue());
    if (script) {
        localStorage.setItem("myscript",script);
    }
}

function script_isValid()
{
    var lint_errors = [];
    // editor.emit("jslint", lint_errors);


    var annotations = editor.getSession().getAnnotations();
    if (Object.keys(annotations).length == 0 ) {

        return true;
    } else {
        return false;
    }
}

function installACEEditor() {

    editor = ace.edit("editor");
    editor.isModified = false;
    editor.setTheme("ace/theme/monokai");
    editor.getSession().setMode("ace/mode/javascript");
    editor.getSession().on('changeAnnotation',function () {
        if (script_isValid()) {
            if (editor.isModified) {
                $("#button").show();
            }
        } else {
            $("#button").hide();            
        }
    });
    editor.getSession().on('change', function(e) {
        editor.isModified = true;
        clearTimeout(delay);
        delay = setTimeout(function() {

        }, 400);
        // e.type, etc
    });


    delay = setTimeout(updatePreview, 2000);
    
    updatePreview();

}

/*function installCodeMirrorEditor() {
    editor = CodeMirror.fromTextArea(document.getElementById("code"), {
            lineNumbers: true,
            theme: "ambiance",
            matchBrackets: true,
            extraKeys: {
                "Enter": "newlineAndIndentContinueComment" ,
                "Ctrl-Space": "autocomplete"
            }});
    $('.CodeMirror').css({ "float":"top",width:"50%",height:"auto",position:"absolute" , "overflow-x": "auto", "overflow-y": "hidden"});

    CodeMirror.commands.autocomplete = function(cm) {
            CodeMirror.simpleHint(cm, CodeMirror.javascriptHint);
    }

    editor.on("change", function() {
          clearTimeout(delay);

           delay = setTimeout(function() {
             $("#button").show();
           }, 2000);
    });

    delay = setTimeout(updatePreview, 2000);
}
*/
function installEditor() { return installACEEditor(); }

function updatePreview() {
    send_and_build_up_csg();
    editor.isModified=false;
    $("#button").hide();
    clearTimeout();
}


function handle_json_error(request, statusText, errorThrown) {

    "use strict";
    console.log(request);
    lastAjaxDuration = new Date() - lastAjaxStart;

    // var obj = JSON.parse(err.responseText);
    $("#ascii_mesh").text(request.responseText + " duration :  " + lastAjaxDuration + " ms");


}

function rgb2hex( rgb ) {

    return ( rgb[ 0 ] * 255 << 16 ) + ( rgb[ 1 ] * 255 << 8 ) + rgb[ 2 ] * 255;

}
function process_single_mesh(rootNode,jsonEntry)
{
    var jsonFace = jsonEntry.mesh;
   //  $("#ascii_mesh").append("<p>face "+  jsonEntry.name + " vertices :" + jsonFace.vertices.length + ", faces : " + jsonFace.faces.length + " color = " +  jsonEntry.color + " </p>");

    jsonFace.scale = 1.0;
    var jsonLoader = new THREE.JSONLoader();

    var model;

    model = jsonLoader.createModel( jsonFace,

        function(geometry,material ){
            material = new THREE.MeshLambertMaterial({color: rgb2hex(jsonFace.materials[0].colorDiffuse) });
            var mesh = new THREE.Mesh(geometry,material);
            console.log("material" ,material );
            rootNode.add(mesh);

        },/* texturePath */ undefined);

}
function install_json_mesh(json) {

    "use strict";


    var oldObj = scene.getChildByName("CSG");
    if (oldObj) { scene.remove(oldObj); }
    var rootNode  = new THREE.Object3D();
    rootNode.name ="CSG";
    scene.add(rootNode);

    $("#ascii_mesh").text("");

    var beautified = JSON.stringify(json,null,"");
    $("#ascii_mesh").append("<p>duration: " + lastAjaxDuration + " ms   - size :" + beautified.length + " bytes</p><br/>");


    var jsonFaces = json.faces;
    jsonFaces.forEach(function(faceArray) {
        // one object
        faceArray.forEach(function(face){
            // one face
            process_single_mesh(rootNode,face);
        });
    });
    // log
    json.logs.forEach(function(line){
        var str = "";
        for ( var a in line ) {
            str += line[a];
        }
        $("#ascii_mesh").append("<p>" + str + "</p>");
    })

    // Refocus camera to the center of the new object
    COG = shapeCenterOfGravity(rootNode);
    camera.lookAt(COG);
    controls.target.set( COG.x, COG.y, COG.z );


}


/**
 * In send_and_build_up_csg_method1 the construction script is passed to the server as a text string
 * and executed by the server in a sandbox to produce the corresponding mesh.
 */
function send_and_build_up_csg_method2() {
    "use strict";


    var encoded_script = encodeURIComponent(editor.getValue());

    saveUserSession();

    lastAjaxStart = new Date();

    $.ajax({
        url: "/csg1" ,
        data: JSON.stringify({ script: encoded_script}),
        type: "POST",
        contentType: "application/json",
        cache: false,
        dataType:"json",
        statusCode: {
            404: function() {
                $("#response").html('Could not contact server.');
            },
            500: function() {
                $("#response").html('A server-side error has occurred.');
            }
        },

        error: handle_json_error
    }).done( function(json) {
            lastAjaxDuration = new Date() - lastAjaxStart;
            install_json_mesh(json);
     });
}

/**
 * In send_and_build_up_csg_method1 the construction script is executed on the client javascript engine
 * to produce a JSON object that contains the modeling instructions. The JSON data structure is sent
 * to the server to produce the mesh of the corresponding solid
 */
function send_and_build_up_csg_method1() {
    "use strict";
    var object;
    var err_txt= "";
    $("#ascii_mesh").text(err_txt);
    try {

        // using simple text area
        // var code = $("#code").val();
        // /var myCodeMirror = CodeMirror.fromTextArea( $("#code")[0]);
        var code = editor.getValue();
            code = " var csg = new CSGTree();" + "var b__ = function() { " + code + "}; b__(); return csg; " ;

        // interpret the script
        object = new Function(code)();

        err_txt= '';
    } catch (e) {
        err_txt= 'Error: <code>' + e.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code>';
        $("#ascii_mesh").text(err_txt);
        return;
    }

    $.ajax({
        url: "/csg" ,
        data: JSON.stringify(object),
        type: "POST",
        contentType: "application/json",
        cache: false,
        dataType:"json",
        error: handle_json_error
    }).done( function(json) { install_json_mesh(json); });
}


function send_and_build_up_csg() {
    "use strict";
    send_and_build_up_csg_method2();
}
function SceneCtrl($scope) {
    "use strict";
    $scope.getCamera =function() {
        return camera;
    };

    $scope.COG = COG; // center of gravity

/*
    //xx $scope.__defineGetter__("camera", function(){

    //xx     return camera;
    //xx });
    $scope.camera1 = {};
    $scope.camera1.position = {};

    $scope.camera1.position.x = camera.position.x;
    $scope.camera1.position.y = camera.position.y;
    $scope.camera1.position.z = camera.position.z;
*/
}

function updateAJS() {
    // get Angular scope from the known DOM element
    var e = document.getElementById('myAngularApp');
    var scope = angular.element(e).scope();

    SceneCtrl(scope);
    scope.$apply();
}



function installSpinnerOnAjaxCall()
{

    $('#loadingDiv')
    .hide()  // hide it initially
    .ajaxStart(function() {
        $(this).show();
        lastJQueryStart = new Date();
    })
    .ajaxStop(function() {
        $(this).hide();
        lastAjaxDuration=new Date() - lastJQueryStart;
    });
}
