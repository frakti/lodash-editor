'use strict'

import _ from 'lodash'
import React, {Component} from 'react'
import JavaScriptEditor from './JavaScriptEditor'
import LodashWrapper from './LodashWrapper'
import {Alert, Button, Grid, Row, Col, Label, FormControl, InputGroup} from 'react-bootstrap'
import packageJson from '../package.json'
import copy from 'copy-to-clipboard'
import 'whatwg-fetch'

export default class Editor extends Component {
  state = {
    content: '',
    data: '',
    stats: [],
    versions: [],
    result: null,
    error: null
  }

  componentWillMount () {
    fetch('http://api.jsdelivr.com/v1/jsdelivr/libraries/lodash')
      .then(response => response.json())
      .then(cdn => {
        const [{versions}] = cdn
        this.lodashLab.onload = () => {
          this.lodashLab.switchLodash(versions[0], () => null)
        }
        this.setState({versions})
      })
  }

  componentDidMount () {
    this.lodashLab = document.getElementById('lodash-lab').contentWindow
  }

  onChangeContent = (content) => {
    this.processContent(content)
  }

  processContent = (content) => {
    const {data} = this.state

    try {

      const [result, stats] = this.lodashLab.execute(LodashWrapper, content, data)

      this.setState((prevState) => {
        if (!_.isEqual(prevState.result, result)) {
          ga('send', 'event', 'Transformer', 'new-result');
        }

        return {
          content,
          data,
          stats,
          result,
          error: null
        }
      })
    } catch (e) {
      this.setState({
        content,
        error: "Can't process, fix function or test data"
      })
    }
  }

  onUseExample = () => {
    this.refs.inputData.editor.setValue(`[{"city": "Rybnik"}, {"city": "Warszawa"}, {"city": "Katowice"}]`)

    this.refs.editor.editor.setValue(`return _(data)
      .map('city')
      .sortBy()
      .value()`)

    // Temporal workaround to process content after replacing editor value
    setTimeout(() => this.processContent(this.state.content), 0)

    ga('send', 'event', 'Transformer', 'use-example');
  }

  onCopyToClipboard = () => {
    copy(this.state.content)
    ga('send', 'event', 'Transformer', 'copy-to-clipboard');
  }

  onBeautifyJson = () => {
    const {data} = this.state

    try {
      const json = JSON.parse(data)
      this.refs.inputData.editor.setValue(JSON.stringify(json, null, 2));
      ga('send', 'event', 'Input Data', 'beautify');
    } catch (e) {}
  }

  onSwitchLodashVersion = (event) => {
    const {target: {value}} = event

    this.lodashLab.switchLodash(value, (a) => {
      console.info(a)
    })
  }

  render () {
    const {content, data, stats, result, error, versions} = this.state

    return (
      <Grid>
        <h2 style={{marginBottom: 0}}>Dexter's Labs</h2>
        <Label bsStyle="success">v{packageJson.version}</Label>
        {' '}
        <br />
        <br />
        <InputGroup style={{width: '150px'}}>
          <InputGroup.Addon>Lodash</InputGroup.Addon>
          <FormControl componentClass="select" placeholder="select" onChange={this.onSwitchLodashVersion}>
            {_.map(versions, version => <option key={version}>{version}</option>)}
          </FormControl>
        </InputGroup>

        <Row>
          <Col md={6}>
            <h3>Editor</h3>
            <JavaScriptEditor
              ref='editor'
              onChange={this.onChangeContent}
              defaultValue={content}
            />
          <Button onClick={this.onUseExample} className='m-a'>Use example</Button>
          <Button onClick={this.onCopyToClipboard} className='m-a'>Copy to clipboard</Button>
          </Col>
          <Col md={6}>
            <h3>Input data</h3>
            <JavaScriptEditor
              ref='inputData'
              json
              onChange={(data) => {
                this.setState({data})
                this.processContent(this.state.content)
              }}
              defaultValue={data}
            />
            <Button onClick={this.onBeautifyJson} className='m-a'>Beautify JSON</Button>
          </Col>
        </Row>

        <div className='preview'>
          {error && <Alert bsStyle='danger' className='m-a'>{error}</Alert>}
          <h3>Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
          <h3>Steps</h3>
          {
            _.map(stats, (step) => {
              return <Row key={step.step}>
                <Col md={1}>
                  Step: {step.step}
                </Col>
                <Col md={2}>
                  Function: <pre>{step.funcName}</pre>
                </Col>
                <Col md={6}>
                  Input: <pre>{step.args}</pre>
                </Col>
                <Col md={3}>
                  Output: <pre>{step.result}</pre>
                </Col>
                <hr />
              </Row>
            })
          }
        </div>
        <iframe src='lodash.html' id='lodash-lab' style={{display: 'none'}} />
      </Grid>
    )
  }
}
