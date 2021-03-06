//
// Global accessor.
//
var flowchart = {};

// Module.
(function () {

    //
    // Width of a node.
    //
    flowchart.defaultNodeWidth = 218;

    //
    // Amount of space reserved for displaying the node's name.
    //
    flowchart.nodeNameHeight = 40;

    //
    // Height of a connector in a node.
    //
    flowchart.connectorHeight = 35;

    flowchart.defaultNodeHeight = 90;

    //
    // Compute the Y coordinate of a connector, given its index.
    //
    flowchart.computeConnectorY = function (connectorIndex) {
        return flowchart.nodeNameHeight + (connectorIndex * flowchart.connectorHeight);
    };

    // compute the x coordinate of a connector, (only 2 connector)
    flowchart.computeConnectorX = function (connectorIndex, parentWidth) {
        return connectorIndex === 0 ? parentWidth * 0.25 : parentWidth * 0.75;
    };

    //
    // Compute the position of a connector in the graph.
    //
    flowchart.computeConnectorPos = function (node, connectorIndex, inputConnector) {
        var nodeWidth = node.width ? node.width() : flowchart.defaultNodeWidth;
        return {
            x: node.x() + (inputConnector ? nodeWidth * 0.5 : flowchart.computeConnectorX(connectorIndex, nodeWidth)),
            y: node.y() + (inputConnector ? 0 : node.height ? node.height() : flowchart.defaultNodeHeight)

        };
    };

    flowchart.computeNodeConnectorPos = function (node, connectorIndex) {
        if (connectorIndex === 0) {
            return {x: node.x() + node.width() * 0.5, y: node.y() + node.height()};
        } else {
            return {x: node.x() + node.width(), y: node.y() + node.height() * 0.5};
        }
    };

    //
    // View model for a connector.
    //
    flowchart.ConnectorViewModel = function (connectorDataModel, x, y, parentNode) {
        this.data = connectorDataModel;
        this._parentNode = parentNode;
        this._x = x;
        this._y = y;

        //
        // The name of the connector.
        //
        this.name = function () {
            return this.data.name;
        };
        //
        // The color of the connector.
        //
        this.color = function () {
            return this.data.color;
        };

        //
        // X coordinate of the connector.
        //
        this.x = function () {
            return this._x;
        };

        //
        // Y coordinate of the connector.
        //
        this.y = function () {
            return this._y;
        };

        //
        // The parent node that the connector is attached to.
        //
        this.parentNode = function () {
            return this._parentNode;
        };
    };

    //
    // Create view model for a list of data models.
    //
    var createConnectorsViewModel = function (connectorDataModels, y, parentNode, inputConnector) {
        var viewModels = [];

        if (connectorDataModels) {
            for (var i = 0; i < connectorDataModels.length; ++i) {
                var connectorViewModel =
                    new flowchart.ConnectorViewModel(connectorDataModels[i],
                        inputConnector ? parentNode.width() * 0.5 : flowchart.computeConnectorX(i, parentNode.width()),
                        y, parentNode);
                viewModels.push(connectorViewModel);
            }
        }

        return viewModels;
    };

    var createOutputConnectorsViewModelForNode = function (connectorDataModels, parentNode) {
        var viewModels = [];
        if (connectorDataModels) {
            //agree connector
            viewModels.push(new flowchart.ConnectorViewModel(connectorDataModels[0],
                parentNode.width() * 0.5, parentNode.height(), parentNode));

            //disagree connector
            viewModels.push(new flowchart.ConnectorViewModel(connectorDataModels[1],
                parentNode.width(), parentNode.height() * 0.5, parentNode));
        }
        return viewModels;
    };

    //
    // View model for a node.
    //
    flowchart.NodeViewModel = function (nodeDataModel) {

        this.data = nodeDataModel;

        // set the default width value of the node
        if (!this.data.width || this.data.width < 0) {
            this.data.width = flowchart.defaultNodeWidth;
        }
        // set the default width value of the node
        if (!this.data.height || this.data.height < 0) {
            this.data.height = flowchart.defaultNodeHeight;
        }

        // Set to true when the node is selected.
        this._selected = false;

        //
        // Name of the node.
        //
        this.name = function () {
            return this.data.name || "";
        };

        //
        // X coordinate of the node.
        //
        this.x = function () {
            return this.data.x;
        };

        //
        // Y coordinate of the node.
        //
        this.y = function () {
            return this.data.y;
        };

        this.getId = function () {
            return this.data.id;
        };

        //
        // Width of the node.
        //
        this.width = function () {
            return this.data.width;
        };

        //
        // Height of the node.
        //
        this.height = function () {
            return this.data.height;
        };

        //
        // Select the node.
        //
        this.select = function () {
            this._selected = true;
        };

        //
        // Deselect the node.
        //
        this.deselect = function () {
            this._selected = false;
        };

        //
        // Toggle the selection state of the node.
        //
        this.toggleSelected = function () {
            this._selected = !this._selected;
        };

        //
        // Returns true if the node is selected.
        //
        this.selected = function () {
            return this._selected;
        };
        this.isEditable = function () {
            return flowchart.isEditable;
        }
        this.isHighlighted = function () {
            "use strict";
            return this.data.highlight;
        }

        //
        // Internal function to add a connector.
        this._addConnector = function (connectorDataModel, x, connectorsDataModel, connectorsViewModel) {
            var connectorViewModel =
                new flowchart.ConnectorViewModel(connectorDataModel, x,
                    flowchart.computeConnectorY(connectorsViewModel.length), this);
            connectorsDataModel.push(connectorDataModel);

            // Add to node's view model.
            connectorsViewModel.push(connectorViewModel);
        };

        //
        // Add an input connector to the node.
        //
        this.addInputConnector = function (connectorDataModel) {
            if (!this.data.inputConnectors) {
                this.data.inputConnectors = [];
            }
            this._addConnector(connectorDataModel, 0, this.data.inputConnectors, this.inputConnectors);
        };

        //
        // Add an ouput connector to the node.
        //
        this.addOutputConnector = function (connectorDataModel) {
            if (!this.data.outputConnectors) {
                this.data.outputConnectors = [];
            }
            this._addConnector(connectorDataModel, this.data.width, this.data.outputConnectors, this.outputConnectors);
        };

        this.inputConnectors = createConnectorsViewModel(this.data.inputConnectors, 0, this, true);
        this.outputConnectors = createOutputConnectorsViewModelForNode(this.data.outputConnectors, this);
    };

    //
    // Wrap the nodes data-model in a view-model.
    //
    var createNodesViewModel = function (nodesDataModel) {
        var nodesViewModel = [];

        if (nodesDataModel) {
            for (var i = 0; i < nodesDataModel.length; ++i) {
                nodesViewModel.push(new flowchart.NodeViewModel(nodesDataModel[i]));
            }
        }

        return nodesViewModel;
    };

    var createConnectorsViewModelForPoint = function (connectorsData, x, y, parentNode) {
        var viewModels = [];
        if (connectorsData) {
            for (var i = 0; i < connectorsData.length; ++i) {
                var connectorViewModel = new flowchart.ConnectorViewModel(connectorsData[i], x, y, parentNode);
                viewModels.push(connectorViewModel);
            }
        }
        return viewModels;
    };

    //
    // View model for a point
    //
    flowchart.PointViewModel = function (pointDataModel) {
        this.data = pointDataModel;

        this._selected = false;

        this.inputConnectors = createConnectorsViewModelForPoint(this.data.inputConnectors, 0, 0, this);
        this.outputConnectors = createConnectorsViewModelForPoint(this.data.outputConnectors, 0, 0, this);
    };

    var pointVMProto = flowchart.PointViewModel.prototype;
    pointVMProto.name = function () {
        return this.data.name;
    };

    pointVMProto.label = function () {
        return this.data.label;
    };

    pointVMProto.x = function () {
        return this.data.x;
    };

    pointVMProto.y = function () {
        return this.data.y;
    };

    pointVMProto.radius = function () {
        return this.data.radius || 10;
    };

    pointVMProto.color = function () {
        return this.data.color || "#880088";
    };

    pointVMProto.select = function () {
        this._selected = true;
    };

    pointVMProto.deselect = function () {
        this._selected = false;
    };

    pointVMProto.toggleSelected = function () {
        this._selected = !this._selected;
    };

    pointVMProto.selected = function () {
        return this._selected;
    };

    pointVMProto._addConnector = function (connectorDataModel, connectorsDataModel, connectorsViewModel) {
        var connectorViewModel = new flowchart.ConnectorViewModel(connectorDataModel, 0, 0, this);
        connectorsDataModel.push(connectorDataModel);
        connectorsViewModel.push(connectorViewModel);
    };

    pointVMProto.addInputConnector = function (connectorDataModel) {
        if (this.data.inputConnectors)
            this.data.inputConnectors = [];
        this._addConnector(connectorDataModel, this.data.inputConnectors, this.inputConnectors);
    };

    pointVMProto.addOutputConnector = function (connectorDataModel) {
        if (this.data.outputConnectors)
            this.data.outputConnectors = [];
        this._addConnector(connectorDataModel, this.data.outputConnectors, this.outputConnectors);
    };

    //
    // Wrap the points data-model in a view-model
    //
    var createPointsViewModel = function (pointsDataModel) {
        var pointsViewModel = [];

        if (pointsDataModel) {
            for (var i = 0; i < pointsDataModel.length; i++) {
                pointsViewModel.push(new flowchart.PointViewModel(pointsDataModel[i]));
            }
        }

        return pointsViewModel;
    };

    //
    // View model for a connection.
    //
    flowchart.ConnectionViewModel = function (connectionDataModel, sourceConnector, destConnector) {

        this.data = connectionDataModel;
        this.source = sourceConnector;
        this.dest = destConnector;

        // Set to true when the connection is selected.
        this._selected = false;

        this.name = function () {
            return this.data.name || "";
        };

        this.sourceCoordX = function () {
            return this.source.parentNode().x() + this.source.x();
        };

        this.sourceCoordY = function () {
            return this.source.parentNode().y() + this.source.y();
        };

        this.sourceCoord = function () {
            return {
                x: this.sourceCoordX(),
                y: this.sourceCoordY()
            };
        };

        this.sourceTangentX = function () {
            return flowchart.computeConnectionSourceTangentX(this.sourceCoord(), this.destCoord());
        };

        this.sourceTangentY = function () {
            return flowchart.computeConnectionSourceTangentY(this.sourceCoord(), this.destCoord());
        };

        this.destCoordX = function () {
            return this.dest.parentNode().x() + this.dest.x();
        };

        this.destCoordY = function () {
            return this.dest.parentNode().y() + this.dest.y();
        };

        this.destCoord = function () {
            return {
                x: this.destCoordX(),
                y: this.destCoordY()
            };
        };

        this.destTangentX = function () {
            return flowchart.computeConnectionDestTangentX(this.sourceCoord(), this.destCoord());
        };

        this.destTangentY = function () {
            return flowchart.computeConnectionDestTangentY(this.sourceCoord(), this.destCoord());
        };

        this.middleX = function (scale) {
            if (typeof(scale) == "undefined")
                scale = 0.5;
            return this.sourceCoordX() * (1 - scale) + this.destCoordX() * scale;
        };

        this.middleY = function (scale) {
            if (typeof(scale) == "undefined")
                scale = 0.5;
            return this.sourceCoordY() * (1 - scale) + this.destCoordY() * scale;
        };


        //
        // Select the connection.
        //
        this.select = function () {
            this._selected = true;
        };

        //
        // Deselect the connection.
        //
        this.deselect = function () {
            this._selected = false;
        };

        //
        // Toggle the selection state of the connection.
        //
        this.toggleSelected = function () {
            this._selected = !this._selected;
        };

        //
        // Returns true if the connection is selected.
        //
        this.selected = function () {
            return this._selected;
        };
    };

    //
    // Helper function.
    //
    var computeConnectionTangentOffset = function (pt1, pt2) {
        return (pt2.x - pt1.x) / 2;
    };

    //
    // Compute the tangent for the bezier curve.
    //
    flowchart.computeConnectionSourceTangentX = function (pt1, pt2) {

        return pt1.x + computeConnectionTangentOffset(pt1, pt2);
    };

    //
    // Compute the tangent for the bezier curve.
    //
    flowchart.computeConnectionSourceTangentY = function (pt1, pt2) {
        return pt1.y;
    };

    //
    // Compute the tangent for the bezier curve.
    //
    flowchart.computeConnectionSourceTangent = function (pt1, pt2) {
        return {
            x: flowchart.computeConnectionSourceTangentX(pt1, pt2),
            y: flowchart.computeConnectionSourceTangentY(pt1, pt2)
        };
    };

    //
    // Compute the tangent for the bezier curve.
    //
    flowchart.computeConnectionDestTangentX = function (pt1, pt2) {
        return pt2.x - computeConnectionTangentOffset(pt1, pt2);
    };

    //
    // Compute the tangent for the bezier curve.
    //
    flowchart.computeConnectionDestTangentY = function (pt1, pt2) {
        return pt2.y;
    };

    //
    // Compute the tangent for the bezier curve.
    //
    flowchart.computeConnectionDestTangent = function (pt1, pt2) {
        return {
            x: flowchart.computeConnectionDestTangentX(pt1, pt2),
            y: flowchart.computeConnectionDestTangentY(pt1, pt2)
        };
    };
    //
    // View model for the chart.
    //
    flowchart.ChartViewModel = function (chartDataModel) {
        if (!chartDataModel) {
            chartDataModel = this.createDefaultData();
        }
        // Reference to the underlying data.
        this.data = chartDataModel;

        //create a view-model for points
        this.points = createPointsViewModel(this.data.points);

        // Create a view-model for nodes.
        this.nodes = createNodesViewModel(this.data.nodes);

        // Create a view-model for connections.
        this.connections = this._createConnectionsViewModel(this.data.connections);
    };

    flowchart.ChartViewModel.START_POINT = 0;
    flowchart.ChartViewModel.SUCCESS_POINT = 1;
    flowchart.ChartViewModel.FAIL_POINT = 2;

    //work flow exceptions
    flowchart.OK = 1;
    flowchart.INVALID_FLOW = 2;  //flow can't reach to success point.
    flowchart.NOT_SUPPORT = 3;

    var chartProto = flowchart.ChartViewModel.prototype;

    chartProto.setEditable = function (bool) {
        flowchart.isEditable = bool;
    }
    chartProto.createDefaultData = function () {
        return {
            nodes: [],
            points: [
                {
                    name: "startPoint",
                    label: "START_PROPOSAL",
                    id: flowchart.ChartViewModel.START_POINT,
                    x: 150,
                    y: 30,
                    color: "#0000ff",
                    radius: 12,
                    inputConnectors: [],
                    outputConnectors: [
                        {name: "start"}
                    ]
                },
                {
                    name: "successPoint",
                    label: "END_PROPOSAL",
                    id: flowchart.ChartViewModel.SUCCESS_POINT,
                    x: 150,
                    y: 520,
                    color: "#00ff00",
                    radius: 15,
                    inputConnectors: [
                        {name: "success"}
                    ],
                    outputConnectors: []
                },
                {
                    name: "failPoint",
                    label: "FAIL_PROPOSAL",
                    id: flowchart.ChartViewModel.FAIL_POINT,
                    x: 400,
                    y: 300,
                    color: "#ff0000",
                    radius: 15,
                    inputConnectors: [
                        {name: "fail"}
                    ],
                    outputConnectors: []
                }
            ],
            connections: [
                {
                    name: "Default Connection",
                    source: {nodeID: 0, connectorIndex: 0},
                    dest: {nodeID: 1, connectorIndex: 0}
                }
            ]
        };
    };

    chartProto.setDefaultLabel = function (para) {
        "use strict";
        this.points[0].label = para[0];
        this.points[1].label = para[1];
        this.points[2].label = para[2];
        console.log(this, para);
    }

    chartProto.resetToDefaultData = function () {
        this.data = this.createDefaultData();
        this.points = createPointsViewModel(this.data.points);
        this.nodes = createNodesViewModel(this.data.nodes);
        this.connections = this._createConnectionsViewModel(this.data.connections);
    };

    chartProto.findPointByType = function (pointType) {
        var points = this.points;
        for (var i = 0, len = points.length; i < len; i++) {
            var point = points[i];
            if (point.data.id === pointType)
                return point;
        }
        return null;
    };

    chartProto.analysisWorkFlows = function () {
        //
        var workflowData = this.data;
        if (!workflowData.nodes || workflowData.nodes.length === 0)
            return flowchart.OK;   // direct execute the proposal.

        if (!workflowData.connections || workflowData.connections.length === 0)
            return flowchart.INVALID_FLOW;


    };

    chartProto.getProcessSteps = function () {
        //return the process steps for save function
        var isProcessOK = this.analysisWorkFlows();

        if (!isProcessOK) {
            //show the error message;
            return null;
        }

    };

    chartProto.getConnectionsByPoint = function (pointType, isSource) {
        isSource = isSource === undefined ? false : isSource;
        var retConnections = [];
        var point = this.findPointByType(pointType);
        if (!point)
            return retConnections;

        var connections = this.connections, i, len, conn;
        if (isSource) {
            for (i = 0, len = connections.length; i < len; i++) {
                conn = connections[i];
                if (conn.data.source.nodeID === point.data.id)
                    retConnections.push(conn);
            }
        } else {
            for (i = 0, len = connections.length; i < len; i++) {
                conn = connections[i];
                if (conn.data.dest.nodeID === point.data.id)
                    retConnections.push(conn);
            }
        }
        return retConnections;
    };


    //
    // Find a specific node within the chart.
    //
    chartProto.findNode = function (nodeID) {
        for (var i = 0; i < this.nodes.length; ++i) {
            var node = this.nodes[i];
            if (node.data.id == nodeID) {
                return node;
            }
        }

        var points = this.points;
        for (i = 0; i < points.length; i++) {
            var point = points[i];
            if (point.data.id === nodeID)
                return point;
        }

        throw new Error("Failed to find node " + nodeID);
    };
    //
    // update a particular node
    //
    chartProto.updateNode = function (nodeId, data) {
        if (!nodeId || !data)return;
        var node = this.findNode(nodeId);
        node.data.name = data.name;
        node.data.departmentData.id = data.departmentData.id;
        node.data.departmentData.name = data.departmentData.name;
        node.data.roleData.id = data.roleData.id;
        node.data.roleData.name = data.roleData.name;
        node.data.triggerAmount.value = data.triggerAmount;
    };

    //
    // Find a specific input connector within the chart.
    //
    chartProto.findInputConnector = function (nodeID, connectorIndex) {
        var node = this.findNode(nodeID);
        if (!node.inputConnectors || node.inputConnectors.length <= connectorIndex) {
            throw new Error("Node " + nodeID + " has invalid input connectors.");
        }
        return node.inputConnectors[connectorIndex];
    };

    //
    // Find a specific output connector within the chart.
    //
    chartProto.findOutputConnector = function (nodeID, connectorIndex) {

        var node = this.findNode(nodeID);

        if (!node.outputConnectors || node.outputConnectors.length <= connectorIndex) {
            throw new Error("Node " + nodeID + " has invalid output connectors.");
        }

        return node.outputConnectors[connectorIndex];
    };

    //
    // Create a view model for connection from the data model.
    //
    chartProto._createConnectionViewModel = function (connectionDataModel) {
        var sourceConnector = this.findOutputConnector(connectionDataModel.source.nodeID, connectionDataModel.source.connectorIndex);
        var destConnector = this.findInputConnector(connectionDataModel.dest.nodeID, connectionDataModel.dest.connectorIndex);
        return new flowchart.ConnectionViewModel(connectionDataModel, sourceConnector, destConnector);
    };

    //
    // Wrap the connections data-model in a view-model.
    //
    chartProto._createConnectionsViewModel = function (connectionsDataModel) {

        var connectionsViewModel = [];

        if (connectionsDataModel) {
            for (var i = 0; i < connectionsDataModel.length; ++i) {
                connectionsViewModel.push(this._createConnectionViewModel(connectionsDataModel[i]));
            }
        }

        return connectionsViewModel;
    };

    //
    // Create a view model for a new connection.
    //
    chartProto.createNewConnection = function (startConnector, endConnector) {
        console.log(this);
        if (!flowchart.isEditable) return;
        var connectionsDataModel = this.data.connections;
        if (!connectionsDataModel) {
            connectionsDataModel = this.data.connections = [];
        }

        var connectionsViewModel = this.connections;
        if (!connectionsViewModel) {
            connectionsViewModel = this.connections = [];
        }

        var startNode = startConnector.parentNode();
        var startConnectorIndex = startNode.outputConnectors.indexOf(startConnector);
        var startConnectorType = 'output';
        if (startConnectorIndex == -1) {
            startConnectorIndex = startNode.inputConnectors.indexOf(startConnector);
            startConnectorType = 'input';
            if (startConnectorIndex == -1) {
                throw new Error("Failed to find source connector within either inputConnectors or outputConnectors of source node.");
            }
        }

        var endNode = endConnector.parentNode();
        var endConnectorIndex = endNode.inputConnectors.indexOf(endConnector);
        var endConnectorType = 'input';
        if (endConnectorIndex == -1) {
            endConnectorIndex = endNode.outputConnectors.indexOf(endConnector);
            endConnectorType = 'output';
            if (endConnectorIndex == -1) {
                throw new Error("Failed to find dest connector within inputConnectors or outputConnectors of dest node.");
            }
        }

        if (startConnectorType == endConnectorType) {
            throw new Error("Failed to create connection. Only output to input connections are allowed.")
        }

        if (startNode == endNode) {
            throw new Error("Failed to create connection. Cannot link a node with itself.")
        }

        startNode = {
            nodeID: startNode.data.id,
            connectorIndex: startConnectorIndex
        };

        endNode = {
            nodeID: endNode.data.id,
            connectorIndex: endConnectorIndex
        };

        var connectionDataModel = {
            source: startConnectorType == 'output' ? startNode : endNode,
            dest: startConnectorType == 'output' ? endNode : startNode,
        };
        connectionsDataModel.push(connectionDataModel);

        var outputConnector = startConnectorType == 'output' ? startConnector : endConnector;
        var inputConnector = startConnectorType == 'output' ? endConnector : startConnector;

        var connectionViewModel = new flowchart.ConnectionViewModel(connectionDataModel, outputConnector, inputConnector);
        connectionsViewModel.push(connectionViewModel);
    };

    //
    // Add a node to the view model.
    //
    chartProto.addNode = function (nodeDataModel) {
        if (!this.data.nodes) {
            this.data.nodes = [];
        }
        console.log(nodeDataModel);
        var selectedNodes = this.getSelectedNodes();
        this.data.nodes.push(nodeDataModel);
        var nodeViewModel = new flowchart.NodeViewModel(nodeDataModel);
        this.nodes.push(nodeViewModel);

        var connectionsVM = this.connections, oldNodeID;
        if (selectedNodes.length === 0) {
            // add the node to startPoint
            var startConnections = this.getConnectionsByPoint(flowchart.ChartViewModel.START_POINT, true);
            if (startConnections.length === 0) {
                var startConn = {
                    name: "startConnection",
                    source: {
                        nodeID: flowchart.ChartViewModel.START_POINT,
                        connectorIndex: 0
                    },
                    dest: {
                        nodeID: nodeViewModel.getId(),
                        connectorIndex: 0
                    }
                };
                this.data.connections.push(startConn);
                connectionsVM.push(this._createConnectionViewModel(startConn));
                oldNodeID = flowchart.ChartViewModel.SUCCESS_POINT;
            } else {
                var selConn = startConnections[0];
                var oldConnData = selConn.data;
                oldNodeID = oldConnData.dest.nodeID;
                oldConnData.dest.nodeID = nodeViewModel.getId();
                connectionsVM.splice(connectionsVM.indexOf(selConn), 1);
                connectionsVM.push(this._createConnectionViewModel(oldConnData));
            }
        } else {
            //add the node behind of selectedNode.
            var selNode = selectedNodes[selectedNodes.length - 1];

            //set position

            var nodeConnection = this._getNodeConnection(selNode, true, 0);
            if (nodeConnection) {
                var connData = nodeConnection.data;
                oldNodeID = connData.dest.nodeID;
                connData.dest.nodeID = nodeViewModel.getId();
                connectionsVM.splice(connectionsVM.indexOf(nodeConnection), 1);
                connectionsVM.push(this._createConnectionViewModel(connData));
            } else {
                //connect to success
                var nodeConn = {
                    name: "agreeConnection_" + selNode.getId(),
                    source: {
                        nodeID: selNode.getId(),
                        connectorIndex: 0
                    },
                    dest: {
                        nodeID: nodeViewModel.getId(),
                        connectorIndex: 0
                    }
                };
                oldNodeID = flowchart.ChartViewModel.SUCCESS_POINT;
                this.data.connections.push(nodeConn);
                connectionsVM.push(this._createConnectionViewModel(nodeConn));
            }
        }
        var agreeConn = {
                name: "agreeConnection_" + nodeViewModel.getId(),
                source: {
                    nodeID: nodeViewModel.getId(),
                    connectorIndex: 0 //0 agree, 1 disagree
                },
                dest: {
                    nodeID: oldNodeID,
                    connectorIndex: 0
                }
            },
            disagreeConn = {
                name: "disagreeConnection_" + nodeViewModel.getId(),
                source: {
                    nodeID: nodeViewModel.getId(),
                    connectorIndex: 1
                },
                dest: {
                    nodeID: flowchart.ChartViewModel.FAIL_POINT,
                    connectorIndex: 0
                }
            };
        this.data.connections.push(agreeConn);
        this.data.connections.push(disagreeConn);
        connectionsVM.push(this._createConnectionViewModel(agreeConn));
        connectionsVM.push(this._createConnectionViewModel(disagreeConn));

        return nodeViewModel;
    };

    chartProto._getNodeConnection = function (node, isSource, idx) {
        isSource = isSource || false;
        idx = idx || 0;
        var connections = this.connections, i, len, conn, nodeId = node.getId();
        if (isSource) {
            for (i = 0, len = connections.length; i < len; i++) {
                conn = connections[i];
                if (conn.data.source.nodeID === nodeId && conn.data.source.connectorIndex === idx)
                    return conn;
            }
        } else {
            for (i = 0, len = connections.length; i < len; i++) {
                conn = connections[i];
                if (conn.data.dest.nodeID === nodeId && conn.data.dest.connectorIndex === idx)
                    return conn;
            }
        }
        return null;
    };

    //
    // Select all nodes and connections in the chart.
    //
    chartProto.selectAll = function () {

        var nodes = this.nodes;
        for (var i = 0; i < nodes.length; ++i) {
            var node = nodes[i];
            node.select();
        }

        var connections = this.connections;
        for (i = 0; i < connections.length; ++i) {
            var connection = connections[i];
            connection.select();
        }
    };

    //
    // Deselect all nodes and connections in the chart.
    //
    chartProto.deselectAll = function () {

        var nodes = this.nodes;
        for (var i = 0; i < nodes.length; ++i) {
            var node = nodes[i];
            node.deselect();
        }

        var connections = this.connections;
        for (i = 0; i < connections.length; ++i) {
            var connection = connections[i];
            connection.deselect();
        }

        var points = this.points;
        for (i = 0; i < points.length; ++i) {
            points[i].deselect();
        }
    };

    //
    // Update the location of the node and its connectors.
    //
    chartProto.updateSelectedNodesLocation = function (deltaX, deltaY) {

        var selectedNodes = this.getSelectedNodes();

        for (var i = 0; i < selectedNodes.length; ++i) {
            var node = selectedNodes[i];
            node.data.x += deltaX;
            node.data.y += deltaY;
        }
    };

    /**
     * update the location of the point and its connectors.
     * @param {Number} deltaX
     * @param {Number} deltaY
     */
    chartProto.updateSelectedPointsLocation = function (deltaX, deltaY) {
        var selectedPoints = this.getSelectedPoints();
        for (var i = 0; i < selectedPoints.length; i++) {
            var point = selectedPoints[i];
            point.data.x += deltaX;
            point.data.y += deltaY;
        }
    };

    //
    // Handle mouse click on a particular node.
    //
    chartProto.handleNodeClicked = function (node, ctrlKey) {

        if (ctrlKey) {
            node.toggleSelected();
        }
        else {
            this.deselectAll();
            node.select();
        }

        // Move node to the end of the list so it is rendered after all the other.
        // This is the way Z-order is done in SVG.

        var nodeIndex = this.nodes.indexOf(node);
        if (nodeIndex == -1) {
            throw new Error("Failed to find node in view model!");
        }
        this.nodes.splice(nodeIndex, 1);
        this.nodes.push(node);
    };

    /**
     * Handle mouse click on a particular node.
     * @param point
     * @param ctrlKey
     */
    chartProto.handlePointClicked = function (point, ctrlKey) {
        if (ctrlKey) {
            point.toggleSelected();
        } else {
            this.deselectAll();
            point.select();
        }

        var nodeIdx = this.points.indexOf(point);
        if (nodeIdx === -1) {
            throw new Error("Fail to find point in view model!");
        }
        this.points.splice(nodeIdx, 1);
        this.points.push(point);
    };

    //
    // Handle mouse down on a connection.
    //
    chartProto.handleConnectionMouseDown = function (connection, ctrlKey) {

        if (ctrlKey) {
            connection.toggleSelected();
        }
        else {
            this.deselectAll();
            connection.select();
        }
    };

    //
    // Delete all nodes and connections that are selected.
    //
    chartProto.deleteSelected = function () {

        var newNodeViewModels = [];
        var newNodeDataModels = [];

        var deletedNodeIds = [];

        //
        // Sort nodes into:
        //		nodes to keep and
        //		nodes to delete.
        //

        for (var nodeIndex = 0; nodeIndex < this.nodes.length; ++nodeIndex) {

            var node = this.nodes[nodeIndex];
            if (!node.selected()) {
                // Only retain non-selected nodes.
                newNodeViewModels.push(node);
                newNodeDataModels.push(node.data);
            }
            else {
                // Keep track of nodes that were deleted, so their connections can also
                // be deleted.
                deletedNodeIds.push(node.data.id);
            }
        }

        var newConnectionViewModels = [];
        var newConnectionDataModels = [];

        //
        // Remove connections that are selected.
        // Also remove connections for nodes that have been deleted.
        //
        for (var connectionIndex = 0; connectionIndex < this.connections.length; ++connectionIndex) {

            var connection = this.connections[connectionIndex];
            if (!connection.selected() &&
                deletedNodeIds.indexOf(connection.data.source.nodeID) === -1 &&
                deletedNodeIds.indexOf(connection.data.dest.nodeID) === -1) {
                //
                // The nodes this connection is attached to, where not deleted,
                // so keep the connection.
                //
                newConnectionViewModels.push(connection);
                newConnectionDataModels.push(connection.data);
            }
        }

        //
        // Update nodes and connections.
        //
        this.nodes = newNodeViewModels;
        this.data.nodes = newNodeDataModels;
        this.connections = newConnectionViewModels;
        this.data.connections = newConnectionDataModels;
    };

    //
    // Select nodes and connections that fall within the selection rect.
    //
    chartProto.applySelectionRect = function (selectionRect) {
        this.deselectAll();

        for (var i = 0; i < this.nodes.length; ++i) {
            var node = this.nodes[i];
            if (node.x() >= selectionRect.x &&
                node.y() >= selectionRect.y &&
                node.x() + node.width() <= selectionRect.x + selectionRect.width &&
                node.y() + node.height() <= selectionRect.y + selectionRect.height) {
                // Select nodes that are within the selection rect.
                node.select();
            }
        }

        for (i = 0; i < this.connections.length; ++i) {
            var connection = this.connections[i];
            if (connection.source.parentNode().selected() &&
                connection.dest.parentNode().selected()) {
                // Select the connection if both its parent nodes are selected.
                connection.select();
            }
        }

    };

    //
    // Get the array of nodes that are currently selected.
    //
    chartProto.getSelectedNodes = function () {
        var selectedNodes = [];

        for (var i = 0; i < this.nodes.length; ++i) {
            var node = this.nodes[i];
            if (node.selected()) {
                selectedNodes.push(node);
            }
        }

        return selectedNodes;
    };

    chartProto.getSelectedPoints = function () {
        var selectedPoints = [];
        for (var i = 0; i < this.points.length; ++i) {
            var point = this.points[i];
            if (point.selected())
                selectedPoints.push(point);
        }
        return selectedPoints;
    };

    //
    // Get the array of connections that are currently selected.
    //
    chartProto.getSelectedConnections = function () {
        var selectedConnections = [];

        for (var i = 0; i < this.connections.length; ++i) {
            var connection = this.connections[i];
            if (connection.selected()) {
                selectedConnections.push(connection);
            }
        }

        return selectedConnections;
    };

})();
