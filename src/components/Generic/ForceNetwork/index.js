import React, { Component } from 'react';
import * as d3 from 'd3';
import styles from './styles.module.css';

export default class ForceNetwork extends Component {
  componentDidMount() {
    this.width = this.svg.node().getBoundingClientRect().width;
    this.height = this.svg.node().getBoundingClientRect().height;
    this.canvas = this.svg.append('g');
    this.lines = this.canvas // Create d3 selection for lines
      .append('g')
      .attr('class', styles['link'])
      .selectAll('line');
    this.circles = this.canvas // Create d3 selection for circles
      .append('g')
      .attr('class', styles['node'])
      .selectAll('circle');

    this.svg
      .on('click', () => {
        this.circles.style('opacity', 1);
        this.lines.style('opacity', 1);
        this.circles.on('mouseover', p => {
          // surfacePaperBox(p);
        });
        //d3.selectAll('.paper-box').classed('selected-paper', false);
        //document.getElementById('selected-paper-box').style.display = 'none';
      }) // Event listener to unselect papers when clicking background
      .call(
        d3.zoom().on('zoom', () => {
          this.canvas.attr('transform', d3.event.transform);
        })
      ) // Event listener to enable zoom by scrolling
      .on('dblclick.zoom', null); // Disable double click zooming

    this.simulation = d3
      .forceSimulation()
      .force(
        'link',
        d3.forceLink().id(function(d) {
          return d.ID;
        })
      )
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(this.width / 2, this.height / 2))
      .force('xattract', d3.forceX())
      .force('yattract', d3.forceY())
      .force(
        'collide',
        d3.forceCollide().radius(function(d) {
          return d.size;
        })
      );
  }

  componentDidUpdate() {
    const { sizeMetric, data, onSelect, selected } = this.props;

    this.nodes = Object.values(data.Papers).map(p => {
      return {
        ID: p.ID,
        seed: p.seed,
        label: p.title,
        size: p.seed ? 10 : 5 * p[sizeMetric]
      };
    });
    this.edges = Object.values(data.Edges).map(e => {
      return {
        source: e.source,
        target: e.target
      };
    });

    let reboundCircles = this.circles.data(this.nodes, d => d.ID); // Rebind data to svg circles
    let newNodes = reboundCircles.enter().size();
    let deadNodes = reboundCircles.exit().size();

    let reboundLines = this.lines.data(this.edges);
    let newEdges = reboundLines.enter().size();
    let deadEdges = reboundLines.exit().size();

    if (true || newNodes || deadNodes || newEdges || deadEdges) {
      // Only restart if there is a network change
      this.circles = reboundCircles
        .join('circle')
        .attr('r', d => d.size)
        .attr('class', function(d) {
          if (d.seed) {
            return styles['seed-node'];
          } else {
            return styles['node'];
          }
        })
        .call(
          d3
            .drag()
            .on('start', d => dragstarted(d, this.simulation))
            .on('drag', d => dragged(d))
            .on('end', d => dragended(d, this.simulation))
        )
        .on('dblclick', p => p) // Display abstract?
        .on('click', p => {
          onSelect(p);
        })
        .on('mouseover', p => {
          //surfacePaperBox(p);
        });

      this.circles.append('title').text(function(d) {
        return d.label;
      }); //Label nodes with title on hover

      this.lines = reboundLines.join('line');

      // Update and restart the simulation.
      this.simulation.nodes(this.nodes).on('tick', () => tick(this));
      this.simulation.force('link').links(this.edges);
      this.simulation.force('collide').initialize(this.simulation.nodes());
      this.simulation.alpha(1).restart();
      this.circles.style('opacity', 1);
      this.lines.style('opacity', 1);
    }

    if (selected.length) {
      //highlightNode(selected[0], this);
    }
  }

  componentWillUnmount() {
    this.simulation.stop();
  }

  render() {
    return (
      <svg
        ref={n => {
          this.svg = d3.select(n);
        }}
        className={styles['force-graph']}
      />
    );
  }
}

function neighbours(a, b, edges) {
  return (
    a === b ||
    edges.filter(e => {
      return (e.source.ID === a && e.target.ID === b) || (e.target.ID === a && e.source.ID === b);
    }).length
  );
}

function highlightNode(id, graph) {
  graph.circles.style('opacity', node => {
    return neighbours(id, node.ID, graph.edges) ? 1 : 0.15;
  });
  graph.lines.style('opacity', edge => {
    return edge.source.ID === id || edge.target.ID === id ? 1 : 0.15;
  });
  //graph.circles.on('mouseover', null);
  //d3.event.stopPropagation();
}

function dragstarted(d, simulation) {
  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}
function dragged(d) {
  d.fx = d3.event.x;
  d.fy = d3.event.y;
}

function dragended(d, simulation) {
  if (!d3.event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

function tick(graph) {
  graph.lines
    .attr('x1', function(d) {
      return d.source.x;
    })
    .attr('y1', function(d) {
      return d.source.y;
    })
    .attr('x2', function(d) {
      return d.target.x;
    })
    .attr('y2', function(d) {
      return d.target.y;
    });
  graph.circles
    .attr('cx', function(d) {
      return d.x;
    })
    .attr('cy', function(d) {
      return d.y;
    });
}